<?php

declare(strict_types=1);

namespace App\Services\Perencanaan;

use App\Models\Opd;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Border;
use OpenSpout\Common\Entity\Style\BorderPart;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IndikatorPenilaianService
{
    /**
     * Resolve target evaluation period ID (default to active period).
     */
    public function resolvePeriodeId(?string $periodeId = null): string
    {
        if (!empty($periodeId)) {
            return $periodeId;
        }

        $active = PeriodePenilaian::where('status', 'aktif')->first();
        if (!$active) {
            throw ValidationException::withMessages([
                'periode' => 'Tidak ada periode penilaian yang aktif saat ini. Silakan aktifkan periode penilaian terlebih dahulu.',
            ]);
        }

        return (string) $active->id;
    }

    /**
     * Get paginated list of evaluation indicators / IKU.
     *
     * @param array<string, mixed> $filters
     */
    public function getPaginatedIndikator(
        array $filters = [],
        int $perPage = 10,
        string $sortBy = 'urutan',
        string $sortDirection = 'asc'
    ): LengthAwarePaginator {
        $periodeId = $this->resolvePeriodeId($filters['periode_penilaian_id'] ?? null);
        $filters['periode_penilaian_id'] = $periodeId;

        $query = IndikatorPenilaian::query()
            ->with(['opd', 'tujuan', 'sasaran', 'periode', 'creator'])
            ->filter($filters);

        $allowedSorts = ['urutan', 'kode_indikator', 'jenis', 'created_at'];
        $sortField = in_array($sortBy, $allowedSorts, true) ? $sortBy : 'urutan';
        $direction = strtolower($sortDirection) === 'desc' ? 'desc' : 'asc';

        return $query->orderBy($sortField, $direction)->paginate($perPage);
    }

    /**
     * Get all evaluation indicators without pagination (dropdown or reporting).
     *
     * @param array<string, mixed> $filters
     * @return Collection<int, IndikatorPenilaian>
     */
    public function getAllIndikator(array $filters = []): Collection
    {
        $periodeId = $this->resolvePeriodeId($filters['periode_penilaian_id'] ?? null);
        $filters['periode_penilaian_id'] = $periodeId;

        return IndikatorPenilaian::query()
            ->with(['opd', 'tujuan', 'sasaran', 'periode'])
            ->filter($filters)
            ->orderBy('urutan', 'asc')
            ->get();
    }

    /**
     * Get KPI statistics for indicators / IKU.
     *
     * @return array<string, mixed>
     */
    public function getStats(?string $periodeId = null): array
    {
        try {
            $resolvedId = $this->resolvePeriodeId($periodeId);
        } catch (\Exception) {
            $resolvedId = null;
        }

        $periode = $resolvedId ? PeriodePenilaian::find($resolvedId) : null;
        $totalOpd = Opd::count();
        $totalSasaran = $resolvedId ? SasaranPenilaian::where('periode_penilaian_id', $resolvedId)->count() : 0;

        if (!$resolvedId) {
            return [
                'total_indikator' => 0,
                'total_iku' => 0,
                'total_indikator_biasa' => 0,
                'sasaran_dengan_indikator' => 0,
                'total_sasaran' => $totalSasaran,
                'opd_terpetakan' => 0,
                'total_opd' => $totalOpd,
                'persentase_pemetaan' => 0,
                'periode_aktif' => null,
            ];
        }

        $totalIndikator = IndikatorPenilaian::where('periode_penilaian_id', $resolvedId)->count();
        $totalIku = IndikatorPenilaian::where('periode_penilaian_id', $resolvedId)->where('jenis', 'IKU')->count();
        $totalBiasa = IndikatorPenilaian::where('periode_penilaian_id', $resolvedId)->where('jenis', 'Biasa')->count();

        $sasaranDenganIndikator = IndikatorPenilaian::where('periode_penilaian_id', $resolvedId)
            ->distinct('sasaran_penilaian_id')
            ->count('sasaran_penilaian_id');

        $opdTerpetakan = IndikatorPenilaian::where('periode_penilaian_id', $resolvedId)
            ->distinct('opd_id')
            ->count('opd_id');

        $persentase = $totalOpd > 0 ? round(($opdTerpetakan / $totalOpd) * 100, 1) : 0;

        return [
            'total_indikator' => $totalIndikator,
            'total_iku' => $totalIku,
            'total_indikator_biasa' => $totalBiasa,
            'sasaran_dengan_indikator' => $sasaranDenganIndikator,
            'total_sasaran' => $totalSasaran,
            'opd_terpetakan' => $opdTerpetakan,
            'total_opd' => $totalOpd,
            'persentase_pemetaan' => $persentase,
            'periode_aktif' => $periode ? [
                'id' => $periode->id,
                'nama_periode' => $periode->nama_periode,
                'tahun_penilaian' => $periode->tahun_penilaian,
                'status' => $periode->status,
            ] : null,
        ];
    }

    /**
     * Get a single indicator with relations.
     */
    public function getIndikatorById(string $id): IndikatorPenilaian
    {
        return IndikatorPenilaian::with(['opd', 'tujuan', 'sasaran', 'periode', 'creator'])->findOrFail($id);
    }

    /**
     * Create a new evaluation indicator / IKU.
     *
     * @param array<string, mixed> $data
     */
    public function createIndikator(array $data, ?User $creator = null): IndikatorPenilaian
    {
        $data['periode_penilaian_id'] = $this->resolvePeriodeId($data['periode_penilaian_id'] ?? null);
        $data['created_by'] = $creator?->id ?? auth('sanctum')->id();

        // Resolve OPD ID & Tujuan ID from Sasaran if omitted
        if (!empty($data['sasaran_penilaian_id'])) {
            $sasaran = SasaranPenilaian::find($data['sasaran_penilaian_id']);
            if ($sasaran) {
                $data['opd_id'] = $data['opd_id'] ?? $sasaran->opd_id;
                $data['tujuan_penilaian_id'] = $data['tujuan_penilaian_id'] ?? $sasaran->tujuan_penilaian_id;
            }
        }

        return DB::transaction(function () use ($data) {
            // Auto order number if omitted
            if (empty($data['urutan'])) {
                $maxUrutan = IndikatorPenilaian::where('periode_penilaian_id', $data['periode_penilaian_id'])
                    ->where('sasaran_penilaian_id', $data['sasaran_penilaian_id'])
                    ->max('urutan');
                $data['urutan'] = ((int) $maxUrutan) + 1;
            }

            // Auto kode_indikator if omitted
            if (empty($data['kode_indikator'])) {
                $prefix = ($data['jenis'] ?? 'IKU') === 'IKU' ? 'IKU' : 'IND';
                $data['kode_indikator'] = sprintf('%s-%02d', $prefix, (int) $data['urutan']);
            }

            $indikator = IndikatorPenilaian::create($data);
            $indikator->load(['opd', 'tujuan', 'sasaran', 'periode', 'creator']);

            return $indikator;
        });
    }

    /**
     * Update an evaluation indicator / IKU.
     *
     * @param array<string, mixed> $data
     */
    public function updateIndikator(IndikatorPenilaian $indikator, array $data): IndikatorPenilaian
    {
        // If sasaran changed, resolve opd and tujuan from new sasaran
        if (!empty($data['sasaran_penilaian_id'])) {
            $sasaran = SasaranPenilaian::find($data['sasaran_penilaian_id']);
            if ($sasaran) {
                $data['opd_id'] = $data['opd_id'] ?? $sasaran->opd_id;
                $data['tujuan_penilaian_id'] = $data['tujuan_penilaian_id'] ?? $sasaran->tujuan_penilaian_id;
            }
        }

        return DB::transaction(function () use ($indikator, $data) {
            $indikator->update($data);
            $indikator->load(['opd', 'tujuan', 'sasaran', 'periode', 'creator']);

            return $indikator;
        });
    }

    /**
     * Delete an evaluation indicator.
     */
    public function deleteIndikator(IndikatorPenilaian $indikator): void
    {
        $indikator->delete();
    }

    /**
     * Copy indicators / IKU from another period into target active period.
     *
     * @return int Number of indicators copied
     */
    public function copyFromPeriode(
        string $sourcePeriodeId,
        ?string $opdId = null,
        ?string $sasaranId = null,
        ?string $jenis = null,
        ?User $creator = null
    ): int {
        $targetPeriodeId = $this->resolvePeriodeId();

        if ($sourcePeriodeId === $targetPeriodeId) {
            throw ValidationException::withMessages([
                'source_periode_id' => 'Periode asal tidak boleh sama dengan periode aktif berjalan.',
            ]);
        }

        $query = IndikatorPenilaian::with(['tujuan', 'sasaran'])->where('periode_penilaian_id', $sourcePeriodeId);
        if (!empty($opdId)) {
            $query->where('opd_id', $opdId);
        }
        if (!empty($sasaranId)) {
            $query->where('sasaran_penilaian_id', $sasaranId);
        }
        if (!empty($jenis) && $jenis !== 'all') {
            $query->where('jenis', $jenis);
        }

        $sourceItems = $query->orderBy('urutan', 'asc')->get();
        if ($sourceItems->isEmpty()) {
            throw ValidationException::withMessages([
                'source_periode_id' => 'Tidak ada data indikator / IKU yang ditemukan pada periode sumber tersebut.',
            ]);
        }

        $userId = $creator?->id ?? auth('sanctum')->id();
        $copiedCount = 0;

        DB::transaction(function () use ($sourceItems, $targetPeriodeId, $userId, &$copiedCount) {
            foreach ($sourceItems as $item) {
                // 1. Resolve Target Tujuan
                $targetTujuanId = null;
                if ($item->tujuan) {
                    $sourceTuj = $item->tujuan;
                    $targetTujuan = TujuanPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                        ->where('opd_id', $item->opd_id)
                        ->where(function ($q) use ($sourceTuj) {
                            $q->where('kode_tujuan', $sourceTuj->kode_tujuan)
                                ->orWhere('tujuan', $sourceTuj->tujuan);
                        })
                        ->first();

                    if ($targetTujuan) {
                        $targetTujuanId = $targetTujuan->id;
                    } else {
                        $maxTujuanUrutan = TujuanPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                            ->where('opd_id', $item->opd_id)
                            ->max('urutan');
                        $newTujuan = TujuanPenilaian::create([
                            'periode_penilaian_id' => $targetPeriodeId,
                            'opd_id' => $item->opd_id,
                            'kode_tujuan' => $sourceTuj->kode_tujuan,
                            'tujuan' => $sourceTuj->tujuan,
                            'urutan' => ((int) $maxTujuanUrutan) + 1,
                            'keterangan' => 'Disalin otomatis bersama indikator dari periode lampau',
                            'created_by' => $userId,
                        ]);
                        $targetTujuanId = $newTujuan->id;
                    }
                }

                if (!$targetTujuanId) {
                    continue;
                }

                // 2. Resolve Target Sasaran
                $targetSasaranId = null;
                if ($item->sasaran) {
                    $sourceSas = $item->sasaran;
                    $targetSasaran = SasaranPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                        ->where('tujuan_penilaian_id', $targetTujuanId)
                        ->where(function ($q) use ($sourceSas) {
                            $q->where('kode_sasaran', $sourceSas->kode_sasaran)
                                ->orWhere('sasaran', $sourceSas->sasaran);
                        })
                        ->first();

                    if ($targetSasaran) {
                        $targetSasaranId = $targetSasaran->id;
                    } else {
                        $maxSasaranUrutan = SasaranPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                            ->where('tujuan_penilaian_id', $targetTujuanId)
                            ->max('urutan');
                        $newSasaran = SasaranPenilaian::create([
                            'periode_penilaian_id' => $targetPeriodeId,
                            'tujuan_penilaian_id' => $targetTujuanId,
                            'opd_id' => $item->opd_id,
                            'kode_sasaran' => $sourceSas->kode_sasaran,
                            'sasaran' => $sourceSas->sasaran,
                            'urutan' => ((int) $maxSasaranUrutan) + 1,
                            'keterangan' => 'Disalin otomatis bersama indikator dari periode lampau',
                            'created_by' => $userId,
                        ]);
                        $targetSasaranId = $newSasaran->id;
                    }
                }

                if (!$targetSasaranId) {
                    continue;
                }

                // 3. Check if exact indicator already exists in target period
                $exists = IndikatorPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                    ->where('sasaran_penilaian_id', $targetSasaranId)
                    ->where('indikator', $item->indikator)
                    ->exists();

                if (!$exists) {
                    $maxUrutan = IndikatorPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                        ->where('sasaran_penilaian_id', $targetSasaranId)
                        ->max('urutan');

                    IndikatorPenilaian::create([
                        'periode_penilaian_id' => $targetPeriodeId,
                        'tujuan_penilaian_id' => $targetTujuanId,
                        'sasaran_penilaian_id' => $targetSasaranId,
                        'opd_id' => $item->opd_id,
                        'kode_indikator' => $item->kode_indikator,
                        'indikator' => $item->indikator,
                        'jenis' => $item->jenis,
                        'urutan' => ((int) $maxUrutan) + 1,
                        'keterangan' => $item->keterangan ? "{$item->keterangan} (Disalin dari periode lampau)" : 'Disalin dari periode lampau',
                        'created_by' => $userId,
                    ]);

                    $copiedCount++;
                }
            }
        });

        return $copiedCount;
    }

    /**
     * Stream export indicators / IKU to Excel (.xlsx).
     *
     * @param array<string, mixed> $filters
     */
    public function exportIndikator(array $filters = []): StreamedResponse
    {
        $periodeId = $this->resolvePeriodeId($filters['periode_penilaian_id'] ?? null);
        $filters['periode_penilaian_id'] = $periodeId;

        $items = IndikatorPenilaian::query()
            ->with(['opd', 'tujuan', 'sasaran', 'periode', 'creator'])
            ->filter($filters)
            ->orderBy('urutan', 'asc')
            ->get();

        $periode = PeriodePenilaian::find($periodeId);
        $periodeLabel = $periode ? "{$periode->nama_periode}_Tahun_{$periode->tahun_penilaian}" : 'Semua';
        $fileName = 'Data_IKU_dan_Indikator_Renstra_OPD_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $periodeLabel) . '_' . date('Ymd_His') . '.xlsx';

        return response()->streamDownload(function () use ($items) {
            $writer = new Writer();
            $writer->openToFile('php://output');

            $headerBorder = new Border(
                new BorderPart(Border::BOTTOM, Color::rgb(0, 0, 0), Border::WIDTH_THIN, Border::STYLE_SOLID)
            );
            $headerStyle = (new Style())
                ->setFontBold()
                ->setFontSize(11)
                ->setBackgroundColor(Color::rgb(220, 240, 225))
                ->setBorder($headerBorder);

            $headers = [
                'No',
                'Kode OPD',
                'Perangkat Daerah (OPD)',
                'Jenis Indikator',
                'Kode Indikator',
                'Pernyataan Indikator / IKU Renstra',
                'Kode Sasaran',
                'Pernyataan Sasaran Terkait',
                'Kode Tujuan',
                'Pernyataan Tujuan Terkait',
                'No. Urut',
                'Siklus RPJMD',
                'Tahun Penilaian',
                'Catatan / Dokumen Renstra',
                'Dibuat Oleh',
            ];

            $writer->addRow(Row::fromValues($headers, $headerStyle));

            $no = 1;
            foreach ($items as $item) {
                $row = [
                    $no++,
                    $item->opd?->kode ?? '-',
                    $item->opd?->nama ?? '-',
                    $item->jenis,
                    $item->kode_indikator ?? '-',
                    $item->indikator,
                    $item->sasaran?->kode_sasaran ?? '-',
                    $item->sasaran?->sasaran ?? '-',
                    $item->tujuan?->kode_tujuan ?? '-',
                    $item->tujuan?->tujuan ?? '-',
                    $item->urutan,
                    $item->periode?->nama_periode ?? '-',
                    $item->periode?->tahun_penilaian ?? '-',
                    $item->keterangan ?? '-',
                    $item->creator?->name ?? 'Sistem',
                ];
                $writer->addRow(Row::fromValues($row));
            }

            $writer->close();
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
