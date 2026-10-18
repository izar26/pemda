<?php

declare(strict_types=1);

namespace App\Services\Perencanaan;

use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use App\Services\Export\ExcelExportService;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PeriodePenilaianService
{
    public function __construct(
        protected AuditLogService $auditLogService,
        protected ExcelExportService $exportService
    ) {}

    /**
     * Get paginated list of evaluation periods with filters and sorting.
     *
     * @param array<string, mixed> $filters
     */
    public function getPaginatedPeriodes(
        array $filters = [],
        int $perPage = 10,
        string $sortBy = 'tahun_penilaian',
        string $sortDirection = 'desc'
    ): LengthAwarePaginator {
        $query = PeriodePenilaian::query()->with('creator');

        $query->filter($filters);

        $allowedSorts = ['id', 'nama_periode', 'tahun_mulai', 'tahun_akhir', 'tahun_penilaian', 'tanggal_mulai', 'tanggal_akhir', 'status', 'created_at'];
        if (!in_array($sortBy, $allowedSorts, true)) {
            $sortBy = 'tahun_penilaian';
        }

        $sortDirection = strtolower($sortDirection) === 'asc' ? 'asc' : 'desc';

        if ($sortBy === 'tahun_penilaian') {
            $query->orderByRaw("CASE WHEN status = 'aktif' THEN 1 ELSE 2 END ASC")
                ->orderBy('tahun_penilaian', $sortDirection);
        } else {
            $query->orderBy($sortBy, $sortDirection);
        }

        if ($perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        return $query->paginate($perPage);
    }

    /**
     * Get all evaluation periods (unpaginated for select dropdowns).
     *
     * @param array<string, mixed> $filters
     * @return Collection<int, PeriodePenilaian>
     */
    public function getAllPeriodes(array $filters = []): Collection
    {
        $query = PeriodePenilaian::query()->with('creator');
        $query->filter($filters);

        return $query->orderBy('tahun_penilaian', 'desc')->get();
    }

    /**
     * Get the single currently active evaluation period.
     */
    public function getActivePeriode(): ?PeriodePenilaian
    {
        return PeriodePenilaian::with('creator')->where('status', 'aktif')->first();
    }

    /**
     * Get summary KPI statistics for evaluation periods.
     *
     * @return array<string, mixed>
     */
    public function getStats(): array
    {
        $total = PeriodePenilaian::count();
        $activePeriode = $this->getActivePeriode();
        $archivedCount = PeriodePenilaian::where('status', 'arsip')->count();
        $inactiveCount = PeriodePenilaian::where('status', 'tidak_aktif')->count();

        $sisaHariAktif = null;
        if ($activePeriode && $activePeriode->tanggal_akhir) {
            $today = Carbon::today();
            $endDate = Carbon::parse($activePeriode->tanggal_akhir)->startOfDay();
            $sisaHariAktif = (int) $today->diffInDays($endDate, false);
        }

        return [
            'total' => $total,
            'aktif' => $activePeriode ? [
                'id' => $activePeriode->id,
                'nama_periode' => $activePeriode->nama_periode,
                'tahun_penilaian' => $activePeriode->tahun_penilaian,
                'rentang_tahun' => "{$activePeriode->tahun_mulai} - {$activePeriode->tahun_akhir}",
                'tanggal_akhir' => $activePeriode->tanggal_akhir ? Carbon::parse($activePeriode->tanggal_akhir)->format('d M Y') : null,
                'sisa_hari' => $sisaHariAktif,
            ] : null,
            'arsip' => $archivedCount,
            'tidak_aktif' => $inactiveCount,
        ];
    }

    /**
     * Get a single evaluation period with creator loaded.
     */
    public function getPeriodeById(string $id): PeriodePenilaian
    {
        return PeriodePenilaian::with('creator')->findOrFail($id);
    }

    /**
     * Create a new evaluation period.
     * Enforces single active period inside a database transaction.
     *
     * @param array<string, mixed> $data
     */
    public function createPeriode(array $data, ?User $creator = null): PeriodePenilaian
    {
        $data['created_by'] = $creator?->id ?? auth('sanctum')->id();

        return DB::transaction(function () use ($data) {
            if (($data['status'] ?? null) === 'aktif') {
                $tahunMulai = (int) ($data['tahun_mulai'] ?? 0);
                PeriodePenilaian::where('tahun_akhir', '<=', $tahunMulai)->update(['status' => 'arsip']);
                PeriodePenilaian::where('status', 'aktif')->update(['status' => 'tidak_aktif']);
            }

            $periode = PeriodePenilaian::create($data);

            if (($data['status'] ?? null) === 'aktif') {
                $this->syncStatusesAroundActive($periode);
            }

            $periode->load('creator');

            return $periode;
        });
    }

    /**
     * Update an evaluation period.
     * Enforces single active period if status changed to active.
     *
     * @param array<string, mixed> $data
     */
    public function updatePeriode(PeriodePenilaian $periode, array $data): PeriodePenilaian
    {
        return DB::transaction(function () use ($periode, $data) {
            if (($data['status'] ?? null) === 'aktif') {
                $this->syncStatusesAroundActive($periode);
            }

            $periode->update($data);
            $periode->load('creator');

            return $periode;
        });
    }

    /**
     * Directly activate an evaluation period and auto-archive previous cycles.
     */
    public function activatePeriode(PeriodePenilaian $periode): PeriodePenilaian
    {
        return DB::transaction(function () use ($periode) {
            $this->syncStatusesAroundActive($periode);
            $periode->update(['status' => 'aktif']);
            $periode->load('creator');

            return $periode;
        });
    }

    /**
     * Quick switcher tahun penilaian berjalan dalam siklus RPJMD.
     * Otomatis mengaktifkan siklus ini dan mengarsipkan siklus lampau.
     *
     * @throws ValidationException
     */
    public function switchTahun(PeriodePenilaian $periode, int $tahunPenilaian): PeriodePenilaian
    {
        if ($tahunPenilaian < $periode->tahun_mulai || $tahunPenilaian > $periode->tahun_akhir) {
            throw ValidationException::withMessages([
                'tahun_penilaian' => "Tahun penilaian {$tahunPenilaian} berada di luar rentang RPJMD ({$periode->tahun_mulai} - {$periode->tahun_akhir}).",
            ]);
        }

        return DB::transaction(function () use ($periode, $tahunPenilaian) {
            $this->syncStatusesAroundActive($periode);

            $periode->update([
                'tahun_penilaian' => $tahunPenilaian,
                'status' => 'aktif',
                'tanggal_mulai' => "{$tahunPenilaian}-01-02",
                'tanggal_akhir' => "{$tahunPenilaian}-12-30",
            ]);

            $periode->load('creator');

            return $periode;
        });
    }

    /**
     * Otomatis sinkronkan status periode lain saat suatu periode aktif:
     * - Periode yang tahunnya lebih lampau (tahun_akhir <= active->tahun_mulai) -> 'arsip'
     * - Periode masa depan (tahun_mulai >= active->tahun_akhir) -> 'tidak_aktif'
     * - Periode lainnya yang masih berstatus aktif -> 'arsip' (jika tahun_penilaian < active) atau 'tidak_aktif'
     */
    protected function syncStatusesAroundActive(PeriodePenilaian $activePeriode): void
    {
        // 1. Periode yang lebih lampau otomatis jadi arsip
        PeriodePenilaian::where('id', '!=', $activePeriode->id)
            ->where('tahun_akhir', '<=', $activePeriode->tahun_mulai)
            ->update(['status' => 'arsip']);

        // 2. Periode masa depan menjadi tidak_aktif (draft)
        PeriodePenilaian::where('id', '!=', $activePeriode->id)
            ->where('tahun_mulai', '>=', $activePeriode->tahun_akhir)
            ->update(['status' => 'tidak_aktif']);

        // 3. Pastikan semua periode lain selain $activePeriode yang masih aktif dinonaktifkan
        PeriodePenilaian::where('id', '!=', $activePeriode->id)
            ->where('status', 'aktif')
            ->each(function (PeriodePenilaian $other) use ($activePeriode) {
                $newStatus = ($other->tahun_penilaian < $activePeriode->tahun_penilaian) ? 'arsip' : 'tidak_aktif';
                $other->update(['status' => $newStatus]);
            });
    }

    /**
     * Delete an evaluation period with integrity guard.
     *
     * @throws ValidationException
     */
    public function deletePeriode(PeriodePenilaian $periode): void
    {
        if ($periode->status === 'aktif') {
            throw ValidationException::withMessages([
                'status' => 'Periode yang sedang aktif tidak dapat dihapus. Silakan nonaktifkan atau jadikan arsip terlebih dahulu.',
            ]);
        }

        $tujuanCount = $periode->tujuanPenilaians()->count();
        $sasaranCount = $periode->sasaranPenilaians()->count();
        $indikatorCount = $periode->indikatorPenilaians()->count();
        $konteksCount = $periode->konteksPenilaians()->count();
        $operasionalCount = $periode->konteksOperasionals()->count();

        if (
            $tujuanCount > 0 ||
            $sasaranCount > 0 ||
            $indikatorCount > 0 ||
            $konteksCount > 0 ||
            $operasionalCount > 0
        ) {
            $usages = [];
            if ($tujuanCount > 0) {
                $usages[] = "{$tujuanCount} Tujuan";
            }
            if ($sasaranCount > 0) {
                $usages[] = "{$sasaranCount} Sasaran";
            }
            if ($indikatorCount > 0) {
                $usages[] = "{$indikatorCount} Indikator";
            }
            if ($konteksCount > 0) {
                $usages[] = "{$konteksCount} Konteks Strategis";
            }
            if ($operasionalCount > 0) {
                $usages[] = "{$operasionalCount} Konteks Operasional";
            }
            $usageText = implode(', ', $usages);

            throw ValidationException::withMessages([
                'periode' => "Tidak dapat menghapus Periode Penilaian '{$periode->nama_periode}' karena masih memiliki data terkait ({$usageText}). Bersihkan data turunannya terlebih dahulu dari bawah.",
            ]);
        }

        $periode->delete();
    }

    /**
     * Stream export evaluation periods to Excel (.xlsx).
     *
     * @param array<string, mixed> $filters
     */
    public function exportPeriodes(array $filters = []): StreamedResponse
    {
        $query = PeriodePenilaian::query()->with('creator');
        $query->filter($filters);
        $query->orderBy('tahun_penilaian', 'desc');

        $headers = [
            'No',
            'Nama Periode RPJMD',
            'Rentang Tahun RPJMD',
            'Tahun Penilaian Berjalan',
            'Tanggal Mulai',
            'Tanggal Batas Akhir',
            'Status Keaktifan',
            'Sisa Waktu (Hari)',
            'Dibuat Oleh',
            'Keterangan / Catatan Kebijakan',
        ];

        $today = Carbon::today();
        $generator = function () use ($query, $today) {
            $no = 1;
            foreach ($query->lazy(500) as $p) {
                $statusLabel = match ($p->status) {
                    'aktif' => 'Aktif (Sedang Berjalan)',
                    'arsip' => 'Arsip',
                    default => 'Tidak Aktif',
                };

                $sisaHari = '-';
                if ($p->tanggal_akhir) {
                    $endDate = Carbon::parse($p->tanggal_akhir)->startOfDay();
                    $days = (int) $today->diffInDays($endDate, false);
                    $sisaHari = $days >= 0 ? "{$days} hari lagi" : "Lewat {$days} hari";
                }

                yield [
                    $no++,
                    $p->nama_periode,
                    "{$p->tahun_mulai} - {$p->tahun_akhir}",
                    $p->tahun_penilaian,
                    $p->tanggal_mulai ? Carbon::parse($p->tanggal_mulai)->format('d/m/Y') : '-',
                    $p->tanggal_akhir ? Carbon::parse($p->tanggal_akhir)->format('d/m/Y') : '-',
                    $statusLabel,
                    $sisaHari,
                    $p->creator?->name ?? 'Sistem',
                    $p->keterangan ?? '-',
                ];
            }
        };

        $metadata = [
            'Modul' => 'Perencanaan Kinerja & Tata Kelola Risiko Pemda',
            'Tanggal Ekspor' => now()->translatedFormat('d F Y H:i'),
        ];
        if (!empty($filters['search'])) {
            $metadata['Pencarian'] = $filters['search'];
        }
        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $metadata['Filter Status'] = $filters['status'];
        }

        return $this->exportService->streamExport(
            filename: 'Data_Periode_Penilaian_RPJMD',
            title: 'DAFTAR PERIODE PENILAIAN MANAJEMEN RISIKO DAERAH',
            headers: $headers,
            rows: $generator(),
            metadata: $metadata
        );
    }
}
