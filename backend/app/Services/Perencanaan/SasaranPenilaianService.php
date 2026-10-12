<?php

declare(strict_types=1);

namespace App\Services\Perencanaan;

use App\Models\Opd;
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

class SasaranPenilaianService
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
     * Get paginated list of evaluation strategic targets.
     *
     * @param array<string, mixed> $filters
     */
    public function getPaginatedSasaran(
        array $filters = [],
        int $perPage = 10,
        string $sortBy = 'urutan',
        string $sortDirection = 'asc'
    ): LengthAwarePaginator {
        $periodeId = $this->resolvePeriodeId($filters['periode_penilaian_id'] ?? null);
        $filters['periode_penilaian_id'] = $periodeId;

        $query = SasaranPenilaian::query()
            ->with(['opd', 'tujuan', 'periode', 'creator'])
            ->filter($filters);

        $allowedSorts = ['urutan', 'kode_sasaran', 'created_at'];
        $sortField = in_array($sortBy, $allowedSorts, true) ? $sortBy : 'urutan';
        $direction = strtolower($sortDirection) === 'desc' ? 'desc' : 'asc';

        return $query->orderBy($sortField, $direction)->paginate($perPage);
    }

    /**
     * Get all evaluation targets without pagination (dropdown or cascading).
     *
     * @param array<string, mixed> $filters
     * @return Collection<int, SasaranPenilaian>
     */
    public function getAllSasaran(array $filters = []): Collection
    {
        $periodeId = $this->resolvePeriodeId($filters['periode_penilaian_id'] ?? null);
        $filters['periode_penilaian_id'] = $periodeId;

        return SasaranPenilaian::query()
            ->with(['opd', 'tujuan', 'periode'])
            ->filter($filters)
            ->orderBy('urutan', 'asc')
            ->get();
    }

    /**
     * Get KPI statistics for evaluation targets.
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
        $totalTujuan = $resolvedId ? TujuanPenilaian::where('periode_penilaian_id', $resolvedId)->count() : 0;

        if (!$resolvedId) {
            return [
                'total_sasaran' => 0,
                'total_tujuan' => 0,
                'tujuan_dengan_sasaran' => 0,
                'opd_terpetakan' => 0,
                'total_opd' => $totalOpd,
                'persentase_pemetaan' => 0,
                'periode_aktif' => null,
            ];
        }

        $totalSasaran = SasaranPenilaian::where('periode_penilaian_id', $resolvedId)->count();
        $tujuanDenganSasaran = SasaranPenilaian::where('periode_penilaian_id', $resolvedId)
            ->distinct('tujuan_penilaian_id')
            ->count('tujuan_penilaian_id');
        $opdTerpetakan = SasaranPenilaian::where('periode_penilaian_id', $resolvedId)
            ->distinct('opd_id')
            ->count('opd_id');

        $persentase = $totalOpd > 0 ? round(($opdTerpetakan / $totalOpd) * 100, 1) : 0;

        return [
            'total_sasaran' => $totalSasaran,
            'total_tujuan' => $totalTujuan,
            'tujuan_dengan_sasaran' => $tujuanDenganSasaran,
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
     * Get a single evaluation target with relations.
     */
    public function getSasaranById(string $id): SasaranPenilaian
    {
        return SasaranPenilaian::with(['opd', 'tujuan', 'periode', 'creator'])->findOrFail($id);
    }

    /**
     * Create a new strategic target.
     *
     * @param array<string, mixed> $data
     */
    public function createSasaran(array $data, ?User $creator = null): SasaranPenilaian
    {
        $data['periode_penilaian_id'] = $this->resolvePeriodeId($data['periode_penilaian_id'] ?? null);
        $data['created_by'] = $creator?->id ?? auth('sanctum')->id();

        // Ensure OPD ID is resolved from Tujuan if omitted
        if (empty($data['opd_id']) && !empty($data['tujuan_penilaian_id'])) {
            $tujuan = TujuanPenilaian::find($data['tujuan_penilaian_id']);
            if ($tujuan) {
                $data['opd_id'] = $tujuan->opd_id;
            }
        }

        return DB::transaction(function () use ($data) {
            // Auto order number if omitted
            if (empty($data['urutan'])) {
                $maxUrutan = SasaranPenilaian::where('periode_penilaian_id', $data['periode_penilaian_id'])
                    ->where('tujuan_penilaian_id', $data['tujuan_penilaian_id'])
                    ->max('urutan');
                $data['urutan'] = ((int) $maxUrutan) + 1;
            }

            // Auto kode_sasaran if omitted
            if (empty($data['kode_sasaran'])) {
                $data['kode_sasaran'] = sprintf('SAS-%02d', (int) $data['urutan']);
            }

            $sasaran = SasaranPenilaian::create($data);
            $sasaran->load(['opd', 'tujuan', 'periode', 'creator']);

            return $sasaran;
        });
    }

    /**
     * Update an evaluation target.
     *
     * @param array<string, mixed> $data
     */
    public function updateSasaran(SasaranPenilaian $sasaran, array $data): SasaranPenilaian
    {
        // If tujuan changed but opd omitted, sync opd with new tujuan
        if (!empty($data['tujuan_penilaian_id']) && empty($data['opd_id'])) {
            $tujuan = TujuanPenilaian::find($data['tujuan_penilaian_id']);
            if ($tujuan) {
                $data['opd_id'] = $tujuan->opd_id;
            }
        }

        return DB::transaction(function () use ($sasaran, $data) {
            $sasaran->update($data);
            $sasaran->load(['opd', 'tujuan', 'periode', 'creator']);

            return $sasaran;
        });
    }

    /**
     * Delete an evaluation target.
     */
    public function deleteSasaran(SasaranPenilaian $sasaran): void
    {
        $sasaran->delete();
    }

    /**
     * Copy strategic targets from another period into target active period.
     *
     * @return int Number of targets copied
     */
    public function copyFromPeriode(
        string $sourcePeriodeId,
        ?string $opdId = null,
        ?string $tujuanId = null,
        ?User $creator = null
    ): int {
        $targetPeriodeId = $this->resolvePeriodeId();

        if ($sourcePeriodeId === $targetPeriodeId) {
            throw ValidationException::withMessages([
                'source_periode_id' => 'Periode asal tidak boleh sama dengan periode aktif berjalan.',
            ]);
        }

        $query = SasaranPenilaian::with('tujuan')->where('periode_penilaian_id', $sourcePeriodeId);
        if (!empty($opdId)) {
            $query->where('opd_id', $opdId);
        }
        if (!empty($tujuanId)) {
            $query->where('tujuan_penilaian_id', $tujuanId);
        }

        $sourceItems = $query->orderBy('urutan', 'asc')->get();
        if ($sourceItems->isEmpty()) {
            throw ValidationException::withMessages([
                'source_periode_id' => 'Tidak ada data sasaran yang ditemukan pada periode sumber tersebut.',
            ]);
        }

        $userId = $creator?->id ?? auth('sanctum')->id();
        $copiedCount = 0;

        DB::transaction(function () use ($sourceItems, $targetPeriodeId, $userId, &$copiedCount) {
            foreach ($sourceItems as $item) {
                // Check if target tujuan exists; if not, create corresponding tujuan in target period
                $targetTujuanId = null;
                if ($item->tujuan_penilaian_id && $item->tujuan) {
                    $sourceTujuan = $item->tujuan;
                    $matchingTargetTujuan = TujuanPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                        ->where('opd_id', $item->opd_id)
                        ->where(function ($q) use ($sourceTujuan) {
                            $q->where('kode_tujuan', $sourceTujuan->kode_tujuan)
                                ->orWhere('tujuan', $sourceTujuan->tujuan);
                        })
                        ->first();

                    if ($matchingTargetTujuan) {
                        $targetTujuanId = $matchingTargetTujuan->id;
                    } else {
                        $maxTujuanUrutan = TujuanPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                            ->where('opd_id', $item->opd_id)
                            ->max('urutan');

                        $newTujuan = TujuanPenilaian::create([
                            'periode_penilaian_id' => $targetPeriodeId,
                            'opd_id' => $item->opd_id,
                            'kode_tujuan' => $sourceTujuan->kode_tujuan,
                            'tujuan' => $sourceTujuan->tujuan,
                            'urutan' => ((int) $maxTujuanUrutan) + 1,
                            'keterangan' => 'Disalin otomatis bersama sasaran terkait dari periode lampau',
                            'created_by' => $userId,
                        ]);
                        $targetTujuanId = $newTujuan->id;
                    }
                }

                if (!$targetTujuanId) {
                    continue;
                }

                // Check if exact same sasaran already exists in target period
                $exists = SasaranPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                    ->where('tujuan_penilaian_id', $targetTujuanId)
                    ->where('sasaran', $item->sasaran)
                    ->exists();

                if (!$exists) {
                    $maxUrutan = SasaranPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                        ->where('tujuan_penilaian_id', $targetTujuanId)
                        ->max('urutan');

                    SasaranPenilaian::create([
                        'periode_penilaian_id' => $targetPeriodeId,
                        'tujuan_penilaian_id' => $targetTujuanId,
                        'opd_id' => $item->opd_id,
                        'kode_sasaran' => $item->kode_sasaran,
                        'sasaran' => $item->sasaran,
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
     * Stream export strategic targets to Excel (.xlsx).
     *
     * @param array<string, mixed> $filters
     */
    public function exportSasaran(array $filters = []): StreamedResponse
    {
        $periodeId = $this->resolvePeriodeId($filters['periode_penilaian_id'] ?? null);
        $filters['periode_penilaian_id'] = $periodeId;

        $items = SasaranPenilaian::query()
            ->with(['opd', 'tujuan', 'periode', 'creator'])
            ->filter($filters)
            ->orderBy('urutan', 'asc')
            ->get();

        $periode = PeriodePenilaian::find($periodeId);
        $periodeLabel = $periode ? "{$periode->nama_periode}_Tahun_{$periode->tahun_penilaian}" : 'Semua';
        $fileName = 'Data_Sasaran_Renstra_OPD_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $periodeLabel) . '_' . date('Ymd_His') . '.xlsx';

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
                'Kode Sasaran',
                'Pernyataan Sasaran Renstra OPD',
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
                    $item->kode_sasaran ?? '-',
                    $item->sasaran,
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
