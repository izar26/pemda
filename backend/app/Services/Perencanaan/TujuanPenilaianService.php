<?php

declare(strict_types=1);

namespace App\Services\Perencanaan;

use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
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
        $periodeId = $this->resolvePeriodeId($filters['periode_penilaian_id'] ?? null);
        $filters['periode_penilaian_id'] = $periodeId;

        $query = TujuanPenilaian::query()
            ->with(['opd', 'periode', 'creator'])
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
        $periodeId = $this->resolvePeriodeId($filters['periode_penilaian_id'] ?? null);
        $filters['periode_penilaian_id'] = $periodeId;

        return TujuanPenilaian::query()
            ->with(['opd', 'periode'])
            ->filter($filters)
            ->orderBy('urutan', 'asc')
            ->get();
    }

    /**
     * Get KPI statistics for evaluation goals.
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

        if (!$resolvedId) {
            return [
                'total_tujuan' => 0,
                'opd_terpetakan' => 0,
                'total_opd' => $totalOpd,
                'persentase_pemetaan' => 0,
                'periode_aktif' => null,
            ];
        }

        $totalTujuan = TujuanPenilaian::where('periode_penilaian_id', $resolvedId)->count();
        $opdTerpetakan = TujuanPenilaian::where('periode_penilaian_id', $resolvedId)
            ->distinct('opd_id')
            ->count('opd_id');

        $persentase = $totalOpd > 0 ? round(($opdTerpetakan / $totalOpd) * 100, 1) : 0;

        return [
            'total_tujuan' => $totalTujuan,
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
        return TujuanPenilaian::with(['opd', 'periode', 'creator'])->findOrFail($id);
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
            $tujuan->load(['opd', 'periode', 'creator']);

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
        return DB::transaction(function () use ($tujuan, $data) {
            $tujuan->update($data);
            $tujuan->load(['opd', 'periode', 'creator']);

            return $tujuan;
        });
    }

    /**
     * Delete an evaluation goal.
     */
    public function deleteTujuan(TujuanPenilaian $tujuan): void
    {
        $tujuan->delete();
    }

    /**
     * Copy goals from another period into target active period.
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

        $query = TujuanPenilaian::where('periode_penilaian_id', $sourcePeriodeId);
        if (!empty($opdId)) {
            $query->where('opd_id', $opdId);
        }

        $sourceItems = $query->orderBy('urutan', 'asc')->get();
        if ($sourceItems->isEmpty()) {
            throw ValidationException::withMessages([
                'source_periode_id' => 'Tidak ada data tujuan yang ditemukan pada periode sumber tersebut.',
            ]);
        }

        $userId = $creator?->id ?? auth('sanctum')->id();
        $copiedCount = 0;

        DB::transaction(function () use ($sourceItems, $targetPeriodeId, $userId, &$copiedCount) {
            foreach ($sourceItems as $item) {
                // Check if exact same goal already exists for the OPD in target period
                $exists = TujuanPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                    ->where('opd_id', $item->opd_id)
                    ->where('tujuan', $item->tujuan)
                    ->exists();

                if (!$exists) {
                    $maxUrutan = TujuanPenilaian::where('periode_penilaian_id', $targetPeriodeId)
                        ->where('opd_id', $item->opd_id)
                        ->max('urutan');

                    TujuanPenilaian::create([
                        'periode_penilaian_id' => $targetPeriodeId,
                        'opd_id' => $item->opd_id,
                        'kode_tujuan' => $item->kode_tujuan,
                        'tujuan' => $item->tujuan,
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
     * Stream export goals to Excel (.xlsx).
     *
     * @param array<string, mixed> $filters
     */
    public function exportTujuan(array $filters = []): StreamedResponse
    {
        $periodeId = $this->resolvePeriodeId($filters['periode_penilaian_id'] ?? null);
        $filters['periode_penilaian_id'] = $periodeId;

        $items = TujuanPenilaian::query()
            ->with(['opd', 'periode', 'creator'])
            ->filter($filters)
            ->orderBy('urutan', 'asc')
            ->get();

        $periode = PeriodePenilaian::find($periodeId);
        $periodeLabel = $periode ? "{$periode->nama_periode}_Tahun_{$periode->tahun_penilaian}" : 'Semua';
        $fileName = 'Data_Tujuan_Renstra_OPD_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $periodeLabel) . '_' . date('Ymd_His') . '.xlsx';

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
                'Kode Tujuan',
                'Pernyataan Tujuan Strategis',
                'No. Urut',
                'Siklus RPJMD',
                'Tahun Penilaian',
                'Catatan / Sumber Dokumen',
                'Dibuat Oleh',
            ];

            $writer->addRow(Row::fromValues($headers, $headerStyle));

            $no = 1;
            foreach ($items as $item) {
                $row = [
                    $no++,
                    $item->opd?->kode ?? '-',
                    $item->opd?->nama ?? '-',
                    $item->kode_tujuan ?? '-',
                    $item->tujuan,
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
