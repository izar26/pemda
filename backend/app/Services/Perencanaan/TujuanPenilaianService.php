<?php

declare(strict_types=1);

namespace App\Services\Perencanaan;

use App\Models\Master\MasterSumberData;
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

class TujuanPenilaianService
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
     * Resolve optional target evaluation period ID (returns null if no active period).
     */
    public function resolveOptionalPeriodeId(?string $periodeId = null): ?string
    {
        if (!empty($periodeId)) {
            return $periodeId;
        }

        $active = PeriodePenilaian::where('status', 'aktif')->first();

        return $active ? (string) $active->id : null;
    }

    /**
     * Get paginated list of evaluation goals.
     *
     * @param array<string, mixed> $filters
     */
    public function getPaginatedTujuan(
        array $filters = [],
        int $perPage = 10,
        string $sortBy = 'urutan',
        string $sortDirection = 'asc'
    ): LengthAwarePaginator {
        $periodeId = $this->resolveOptionalPeriodeId($filters['periode_penilaian_id'] ?? null);
        if (!$periodeId) {
            return TujuanPenilaian::query()->whereRaw('1 = 0')->paginate($perPage);
        }
        $filters['periode_penilaian_id'] = $periodeId;

        $query = TujuanPenilaian::query()
            ->with(['opd', 'sumberData', 'periode', 'creator'])
            ->withCount('sasarans')
            ->filter($filters);

        $allowedSorts = ['urutan', 'kode_tujuan', 'created_at'];
        $sortField = in_array($sortBy, $allowedSorts, true) ? $sortBy : 'urutan';
        $direction = strtolower($sortDirection) === 'desc' ? 'desc' : 'asc';

        return $query->orderBy($sortField, $direction)->paginate($perPage);
    }

    /**
     * Get all evaluation goals without pagination (dropdown or reporting).
     *
     * @param array<string, mixed> $filters
     * @return Collection<int, TujuanPenilaian>
     */
    public function getAllTujuan(array $filters = []): Collection
    {
        $periodeId = $this->resolveOptionalPeriodeId($filters['periode_penilaian_id'] ?? null);
        if (!$periodeId) {
            return new Collection();
        }
        $filters['periode_penilaian_id'] = $periodeId;

        $items = TujuanPenilaian::query()
            ->with(['opd', 'sumberData', 'periode', 'creator'])
            ->withCount('sasarans')
            ->filter($filters)
            ->orderBy('urutan', 'asc')
            ->get();

        return $items;
    }

    /**
     * Get KPI statistics for evaluation goals (including unified Sasaran & Indikator counts).
     *
     * @return array<string, mixed>
     */
    public function getStats(?string $periodeId = null, ?string $opdId = null): array
    {
        try {
            $resolvedId = $this->resolvePeriodeId($periodeId);
        } catch (\Exception) {
            $resolvedId = null;
        }

        $periode = $resolvedId ? PeriodePenilaian::find($resolvedId) : null;
        $totalOpd = Opd::count();

        if (!$resolvedId) {
            return [
                'total_tujuan' => 0,
                'total_sasaran' => 0,
                'total_indikator' => 0,
                'total_iku' => 0,
                'total_indikator_biasa' => 0,
                'opd_terpetakan' => 0,
                'total_opd' => $totalOpd,
                'persentase_pemetaan' => 0,
                'periode_aktif' => null,
            ];
        }

        $tujuanQuery = TujuanPenilaian::where('periode_penilaian_id', $resolvedId);
        $sasaranQuery = SasaranPenilaian::where('periode_penilaian_id', $resolvedId);
        $indikatorQuery = IndikatorPenilaian::where('periode_penilaian_id', $resolvedId);

        if ($opdId) {
            $tujuanQuery->where('opd_id', $opdId);
            $sasaranQuery->where('opd_id', $opdId);
            $indikatorQuery->where('opd_id', $opdId);
        }

        $totalTujuan = $tujuanQuery->count();
        $totalSasaran = $sasaranQuery->count();
        $totalIndikator = $indikatorQuery->count();
        $totalIku = (clone $indikatorQuery)->where('jenis', 'IKU')->count();
        $totalIndikatorBiasa = (clone $indikatorQuery)->where('jenis', 'Biasa')->count();
        $opdTerpetakan = (clone $tujuanQuery)->distinct('opd_id')->count('opd_id');

        $persentase = $totalOpd > 0 ? round(($opdTerpetakan / $totalOpd) * 100, 1) : 0;

        return [
            'total_tujuan' => $totalTujuan,
            'total_sasaran' => $totalSasaran,
            'total_indikator' => $totalIndikator,
            'total_iku' => $totalIku,
            'total_indikator_biasa' => $totalIndikatorBiasa,
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
     * Get a single evaluation goal with relations.
     */
    public function getTujuanById(string $id): TujuanPenilaian
    {
        return TujuanPenilaian::with(['opd', 'sumberData', 'periode', 'creator'])->findOrFail($id);
    }

    /**
     * Create a new evaluation goal.
     *
     * @param array<string, mixed> $data
     */
    public function createTujuan(array $data, ?User $creator = null): TujuanPenilaian
    {
        $data['periode_penilaian_id'] = $this->resolvePeriodeId($data['periode_penilaian_id'] ?? null);
        $data['created_by'] = $creator?->id ?? auth('sanctum')->id();

        if (!empty($data['sumber_data_id']) && empty($data['keterangan'])) {
            $sumber = MasterSumberData::find($data['sumber_data_id']);
            if ($sumber) {
                $data['keterangan'] = $sumber->nama;
            }
        }

        return DB::transaction(function () use ($data) {
            // Auto order number if omitted
            if (empty($data['urutan'])) {
                $maxUrutan = TujuanPenilaian::where('periode_penilaian_id', $data['periode_penilaian_id'])
                    ->where('opd_id', $data['opd_id'])
                    ->max('urutan');
                $data['urutan'] = ((int) $maxUrutan) + 1;
            }

            // Auto kode_tujuan if omitted
            if (empty($data['kode_tujuan'])) {
                $data['kode_tujuan'] = sprintf('TUJ-%02d', (int) $data['urutan']);
            }

            $tujuan = TujuanPenilaian::create($data);
            $tujuan->load(['opd', 'sumberData', 'periode', 'creator']);

            return $tujuan;
        });
    }

    /**
     * Update an evaluation goal.
     *
     * @param array<string, mixed> $data
     */
    public function updateTujuan(TujuanPenilaian $tujuan, array $data): TujuanPenilaian
    {
        if (!empty($data['opd_id']) && $data['opd_id'] !== $tujuan->opd_id) {
            if ($tujuan->sasarans()->exists() || $tujuan->konteksPenilaians()->exists()) {
                throw ValidationException::withMessages([
                    'opd_id' => 'Tidak dapat mengubah Perangkat Daerah (OPD) pada Tujuan ini karena sudah memiliki Sasaran atau digunakan pada Konteks Penilaian (Form 2B). Bersihkan data turunannya terlebih dahulu dari bawah.',
                ]);
            }
        }

        if (array_key_exists('sumber_data_id', $data) && $data['sumber_data_id'] !== $tujuan->sumber_data_id) {
            if ($tujuan->konteksPenilaians()->exists()) {
                throw ValidationException::withMessages([
                    'sumber_data_id' => 'Tidak dapat mengubah Sumber Data pada Tujuan ini karena sudah digunakan pada Konteks Penilaian Strategis (Form 2B).',
                ]);
            }
        }

        if (!empty($data['sumber_data_id']) && empty($data['keterangan'])) {
            $sumber = MasterSumberData::find($data['sumber_data_id']);
            if ($sumber) {
                $data['keterangan'] = $sumber->nama;
            }
        }

        return DB::transaction(function () use ($tujuan, $data) {
            $tujuan->update($data);
            $tujuan->load(['opd', 'sumberData', 'periode', 'creator']);

            return $tujuan;
        });
    }

    /**
     * Delete an evaluation goal with strict bottom-up guard.
     *
     * @throws ValidationException
     */
    public function deleteTujuan(TujuanPenilaian $tujuan): void
    {
        $sasaranCount = $tujuan->sasarans()->count();
        $indikatorCount = $tujuan->indikators()->count();
        $konteksCount = $tujuan->konteksPenilaians()->count();

        if ($sasaranCount > 0 || $indikatorCount > 0 || $konteksCount > 0) {
            $usages = [];
            if ($sasaranCount > 0) {
                $usages[] = "{$sasaranCount} Sasaran";
            }
            if ($indikatorCount > 0) {
                $usages[] = "{$indikatorCount} Indikator/IKU";
            }
            if ($konteksCount > 0) {
                $usages[] = "{$konteksCount} Konteks Penilaian Strategis (Form 2B)";
            }
            $usageText = implode(', ', $usages);

            throw ValidationException::withMessages([
                'tujuan' => "Tidak dapat menghapus Tujuan ini karena masih memiliki data turunan ({$usageText}). Bersihkan data turunannya terlebih dahulu dari bawah.",
            ]);
        }

        $tujuan->delete();
    }

    /**
     * Reorder evaluation goals within their OPD scope.
     *
     * @param array<int, string> $orderedIds
     */
    public function reorderTujuan(array $orderedIds): void
    {
        DB::transaction(function () use ($orderedIds) {
            foreach (array_values($orderedIds) as $index => $id) {
                $urutan = $index + 1;
                TujuanPenilaian::where('id', $id)->update([
                    'urutan' => $urutan,
                    'kode_tujuan' => sprintf('TUJ-%02d', $urutan),
                ]);
            }
        });
    }

    /**
     * Copy goals (along with their cascading sasarans and indikators) from another period into target active period.
     *
     * @return int Number of goals copied
     */
    public function copyFromPeriode(string $sourcePeriodeId, ?string $opdId = null, ?User $creator = null): int
    {
        $targetPeriodeId = $this->resolvePeriodeId();

        if ($sourcePeriodeId === $targetPeriodeId) {
            throw ValidationException::withMessages([
                'source_periode_id' => 'Periode asal tidak boleh sama dengan periode aktif berjalan.',
            ]);
        }

        $query = TujuanPenilaian::with(['sasarans.indikators', 'opd', 'sumberData'])
            ->where('periode_penilaian_id', $sourcePeriodeId)
            ->whereHas('opd', fn ($q) => $q->where('is_active', true));

        if (!empty($opdId)) {
            $query->where('opd_id', $opdId);
        }

        $sourceItems = $query->orderBy('urutan', 'asc')->get();
        if ($sourceItems->isEmpty()) {
            throw ValidationException::withMessages([
                'source_periode_id' => 'Tidak ada data tujuan (dengan OPD aktif) yang ditemukan pada periode sumber tersebut.',
            ]);
        }

        foreach ($sourceItems as $item) {
            if ($item->sumberData && !$item->sumberData->is_active) {
                throw ValidationException::withMessages([
                    'source_periode_id' => "Tidak dapat menyalin Tujuan '{$item->tujuan}' karena Sumber Data '{$item->sumberData->nama}' saat ini berstatus nonaktif. Aktifkan Sumber Data tersebut terlebih dahulu.",
                ]);
            }
        }

        $userId = $creator?->id ?? auth('sanctum')->id();
        $copiedCount = 0;

        DB::transaction(function () use ($sourceItems, $targetPeriodeId, $userId, &$copiedCount) {
            foreach ($sourceItems as $item) {
                // Check if exact same goal already exists for the OPD in target period
                $targetTujuan = TujuanPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                    ->where('opd_id', $item->opd_id)
                    ->where('tujuan', $item->tujuan)
                    ->first();

                if (!$targetTujuan) {
                    $maxUrutan = TujuanPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                        ->where('opd_id', $item->opd_id)
                        ->max('urutan');

                    $targetTujuan = TujuanPenilaian::create([
                        'periode_penilaian_id' => $targetPeriodeId,
                        'opd_id' => $item->opd_id,
                        'sumber_data_id' => $item->sumber_data_id,
                        'kode_tujuan' => $item->kode_tujuan,
                        'tujuan' => $item->tujuan,
                        'urutan' => ((int) $maxUrutan) + 1,
                        'keterangan' => $item->keterangan ? "{$item->keterangan} (Disalin dari periode lampau)" : 'Disalin dari periode lampau',
                        'created_by' => $userId,
                    ]);

                    $copiedCount++;
                }

                // Cascade copy child Sasarans & Indikators
                foreach ($item->sasarans as $sourceSasaran) {
                    $targetSasaran = SasaranPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                        ->where('tujuan_penilaian_id', $targetTujuan->id)
                        ->where('sasaran', $sourceSasaran->sasaran)
                        ->first();

                    if (!$targetSasaran) {
                        $maxSasUrutan = SasaranPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                            ->where('tujuan_penilaian_id', $targetTujuan->id)
                            ->max('urutan');

                        $targetSasaran = SasaranPenilaian::create([
                            'periode_penilaian_id' => $targetPeriodeId,
                            'tujuan_penilaian_id' => $targetTujuan->id,
                            'opd_id' => $item->opd_id,
                            'kode_sasaran' => $sourceSasaran->kode_sasaran,
                            'sasaran' => $sourceSasaran->sasaran,
                            'urutan' => ((int) $maxSasUrutan) + 1,
                            'keterangan' => $sourceSasaran->keterangan,
                            'created_by' => $userId,
                        ]);
                    }

                    foreach ($sourceSasaran->indikators as $sourceInd) {
                        $indExists = IndikatorPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                            ->where('sasaran_penilaian_id', $targetSasaran->id)
                            ->where('indikator', $sourceInd->indikator)
                            ->exists();

                        if (!$indExists) {
                            $maxIndUrutan = IndikatorPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                                ->where('sasaran_penilaian_id', $targetSasaran->id)
                                ->max('urutan');

                            IndikatorPenilaian::create([
                                'periode_penilaian_id' => $targetPeriodeId,
                                'tujuan_penilaian_id' => $targetTujuan->id,
                                'sasaran_penilaian_id' => $targetSasaran->id,
                                'opd_id' => $item->opd_id,
                                'kode_indikator' => $sourceInd->kode_indikator,
                                'indikator' => $sourceInd->indikator,
                                'jenis' => $sourceInd->jenis,
                                'urutan' => ((int) $maxIndUrutan) + 1,
                                'keterangan' => $sourceInd->keterangan,
                                'created_by' => $userId,
                            ]);
                        }
                    }
                }
            }
        });

        return $copiedCount;
    }

    /**
     * Stream export goals (and cascading sasarans/indikators) to Excel (.xlsx).
     *
     * @param array<string, mixed> $filters
     */
    public function exportTujuan(array $filters = []): StreamedResponse
    {
        $periodeId = $this->resolveOptionalPeriodeId($filters['periode_penilaian_id'] ?? null);
        if ($periodeId) {
            $filters['periode_penilaian_id'] = $periodeId;
            $items = TujuanPenilaian::query()
                ->with(['opd', 'sumberData', 'sasarans.indikators', 'periode', 'creator'])
                ->filter($filters)
                ->orderBy('urutan', 'asc')
                ->get();
        } else {
            $items = new Collection();
        }

        $periode = $periodeId ? PeriodePenilaian::find($periodeId) : null;
        $periodeLabel = $periode ? "{$periode->nama_periode}_Tahun_{$periode->tahun_penilaian}" : 'Semua';
        $fileName = 'Data_Tujuan_Sasaran_Indikator_OPD_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $periodeLabel) . '_' . date('Ymd_His') . '.xlsx';

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
                'Sumber Data',
                'Tujuan',
                'Sasaran',
                'Indikator',
                'Jenis Indikator',
                'Siklus RPJMD',
                'Tahun Penilaian',
            ];

            $writer->addRow(Row::fromValues($headers, $headerStyle));

            $no = 1;
            foreach ($items as $item) {
                $sumberLabel = $item->sumberData?->nama ?? $item->keterangan ?? '-';
                if ($item->sasarans->isEmpty()) {
                    $writer->addRow(Row::fromValues([
                        $no++,
                        $item->opd?->kode ?? '-',
                        $item->opd?->nama ?? '-',
                        $sumberLabel,
                        $item->tujuan,
                        '-',
                        '-',
                        '-',
                        $item->periode?->nama_periode ?? '-',
                        $item->periode?->tahun_penilaian ?? '-',
                    ]));
                    continue;
                }

                foreach ($item->sasarans as $sasaran) {
                    if ($sasaran->indikators->isEmpty()) {
                        $writer->addRow(Row::fromValues([
                            $no++,
                            $item->opd?->kode ?? '-',
                            $item->opd?->nama ?? '-',
                            $sumberLabel,
                            $item->tujuan,
                            $sasaran->sasaran,
                            '-',
                            '-',
                            $item->periode?->nama_periode ?? '-',
                            $item->periode?->tahun_penilaian ?? '-',
                        ]));
                        continue;
                    }

                    foreach ($sasaran->indikators as $indikator) {
                        $writer->addRow(Row::fromValues([
                            $no++,
                            $item->opd?->kode ?? '-',
                            $item->opd?->nama ?? '-',
                            $sumberLabel,
                            $item->tujuan,
                            $sasaran->sasaran,
                            $indikator->indikator,
                            $indikator->jenis,
                            $item->periode?->nama_periode ?? '-',
                            $item->periode?->tahun_penilaian ?? '-',
                        ]));
                    }
                }
            }

            $writer->close();
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
