<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Perencanaan;

use App\Http\Controllers\Controller;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\PeriodePerencanaan;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PeriodePenilaianController extends Controller
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    /**
     * List all Periode Perencanaan & Evaluation Years (Fitur 13).
     */
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('perencanaan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data periode perencanaan.');
        }

        $cycles = PeriodePerencanaan::query()
            ->with(['tahunPenilaians' => function ($q) {
                $q->orderBy('tahun', 'asc');
            }])
            ->orderBy('tahun_mulai', 'desc')
            ->orderBy('status', 'asc')
            ->get();

        // Also fetch flat list of evaluation years for backward compatibility with existing dropdowns
        $flatYears = PeriodePenilaian::query()
            ->with('periodePerencanaan')
            ->orderBy('tahun', 'desc')
            ->orderBy('status', 'asc')
            ->get();

        $activeYear = PeriodePenilaian::with('periodePerencanaan')
            ->where('status', 'active')
            ->first();

        return response()->json([
            'data' => $cycles,
            'flat' => $flatYears,
            'active' => $activeYear,
            'can_manage' => $request->user()->can('perencanaan.periode'),
        ]);
    }

    /**
     * Get currently active evaluation year & planning cycle.
     */
    public function active(Request $request): JsonResponse
    {
        if (!$request->user()->can('perencanaan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat periode aktif.');
        }

        $active = PeriodePenilaian::with('periodePerencanaan')
            ->where('status', 'active')
            ->first();

        if (!$active) {
            $active = PeriodePenilaian::with('periodePerencanaan')
                ->orderBy('tahun', 'desc')
                ->first();
        }

        return response()->json([
            'data' => $active,
        ]);
    }

    /**
     * Validate against overlapping planning cycles (Anti-Bentrok).
     */
    protected function checkOverlap(int $tahunMulai, int $tahunSelesai, ?string $excludeId = null): ?PeriodePerencanaan
    {
        return PeriodePerencanaan::query()
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))
            ->where(function ($q) use ($tahunMulai, $tahunSelesai) {
                // Rentang [A_mulai, A_selesai] bentrok jika:
                // A_mulai <= B_selesai DAN A_selesai >= B_mulai
                $q->where('tahun_mulai', '<=', $tahunSelesai)
                  ->where('tahun_selesai', '>=', $tahunMulai);
            })
            ->first();
    }

    /**
     * Store a new Periode Perencanaan (Cycle) and auto-generate evaluation years.
     */
    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('perencanaan.periode')) {
            abort(403, 'Hanya Bapperida / Administrator yang berhak menambahkan periode perencanaan.');
        }

        // 1. Strict validation of string format if periode string is provided
        $periodeStr = $request->input('periode_penilaian') ?? $request->input('periode');
        if (is_string($periodeStr) && trim($periodeStr) !== '') {
            $trimmed = trim($periodeStr);
            // Must strictly match 4-digit year, dash/hyphen, 4-digit year
            if (!preg_match('/^([12]\d{3})\s*[-–]\s*([12]\d{3})$/', $trimmed, $matches)) {
                return response()->json([
                    'message' => "Format periode tidak valid: '{$trimmed}'. Format harus berupa rentang tahun 4 digit, contoh: 2026-2030.",
                ], 422);
            }
            $tahunMulai = (int) $matches[1];
            $tahunSelesai = (int) $matches[2];
        } else {
            $tahunMulai = (int) ($request->input('tahun_mulai') ?? 0);
            $tahunSelesai = (int) ($request->input('tahun_selesai') ?? 0);
        }

        if (!$tahunMulai) {
            return response()->json([
                'message' => 'Tahun mulai periode perencanaan wajib diisi.',
            ], 422);
        }

        if (!$tahunSelesai) {
            $durasi = (int) ($request->input('durasi_tahun') ?? 5);
            $tahunSelesai = $tahunMulai + $durasi - 1;
        }

        // Validate duration (Standar RPJMD 5 tahun, max 6 tahun jika transisi)
        $durasiTahun = $tahunSelesai - $tahunMulai + 1;
        if ($durasiTahun < 1 || $durasiTahun > 6) {
            return response()->json([
                'message' => "Durasi periode tidak valid ({$durasiTahun} tahun). Standar siklus RPJMD Pemda adalah 5 tahun (maksimal 6 tahun).",
            ], 422);
        }

        $request->merge([
            'tahun_mulai' => $tahunMulai,
            'tahun_selesai' => $tahunSelesai,
        ]);

        $validated = $request->validate([
            'nama' => ['nullable', 'string', 'max:150'],
            'tahun_mulai' => ['required', 'integer', 'min:2020', 'max:2050'],
            'tahun_selesai' => ['required', 'integer', 'gt:tahun_mulai', 'max:2055'],
            'status' => ['required', 'string', 'in:active,inactive,archived,Aktif,Tidak Aktif,Arsip'],
            'tahun_aktif' => ['nullable', 'integer'],
            'keterangan' => ['nullable', 'string', 'max:500'],
        ]);

        $statusDb = match ($validated['status']) {
            'Aktif', 'active' => 'active',
            'Arsip', 'archived' => 'archived',
            default => 'inactive',
        };

        // 1. Strict Overlap Validation
        $conflict = $this->checkOverlap($validated['tahun_mulai'], $validated['tahun_selesai']);
        if ($conflict) {
            return response()->json([
                'message' => "Rentang tahun {$validated['tahun_mulai']} - {$validated['tahun_selesai']} bentrok dengan siklus '{$conflict->nama}' ({$conflict->tahun_mulai} - {$conflict->tahun_selesai}). Periode perencanaan tidak boleh tumpang tindih.",
            ], 422);
        }

        $namaSiklus = !empty($validated['nama'])
            ? trim($validated['nama'])
            : "RPJMD {$validated['tahun_mulai']} - {$validated['tahun_selesai']}";

        $initialActiveYear = isset($validated['tahun_aktif'])
            ? (int) $validated['tahun_aktif']
            : $validated['tahun_mulai'];

        if ($initialActiveYear < $validated['tahun_mulai'] || $initialActiveYear > $validated['tahun_selesai']) {
            $initialActiveYear = $validated['tahun_mulai'];
        }

        return DB::transaction(function () use ($validated, $statusDb, $namaSiklus, $initialActiveYear, $request) {
            // If new cycle is active, deactivate others
            if ($statusDb === 'active') {
                PeriodePerencanaan::where('status', 'active')->update(['status' => 'inactive']);
                PeriodePenilaian::where('status', 'active')->update(['status' => 'inactive']);
            }

            $periode = PeriodePerencanaan::create([
                'nama' => $namaSiklus,
                'tahun_mulai' => $validated['tahun_mulai'],
                'tahun_selesai' => $validated['tahun_selesai'],
                'durasi_tahun' => ($validated['tahun_selesai'] - $validated['tahun_mulai'] + 1),
                'status' => $statusDb,
                'keterangan' => $validated['keterangan'] ?? null,
            ]);

            // Auto-generate all evaluation years in the cycle
            for ($yr = $validated['tahun_mulai']; $yr <= $validated['tahun_selesai']; $yr++) {
                $isYearActive = ($statusDb === 'active' && $yr === $initialActiveYear);
                PeriodePenilaian::create([
                    'periode_perencanaan_id' => $periode->id,
                    'periode' => "{$validated['tahun_mulai']}-{$validated['tahun_selesai']}",
                    'tahun' => $yr,
                    'tanggal_mulai' => "{$yr}-01-01",
                    'tanggal_berakhir' => "{$yr}-12-31",
                    'status' => $isYearActive ? 'active' : 'inactive',
                    'catatan' => null,
                ]);
            }

            // Log Audit
            $this->auditLogService->log(
                action: 'PERIODE_PENILAIAN_CREATED',
                module: 'Perencanaan Kinerja',
                description: "Menambahkan Siklus Perencanaan baru: {$periode->nama} ({$periode->tahun_mulai} - {$periode->tahun_selesai}) dengan tahun aktif: {$initialActiveYear}",
                user: $request->user(),
                context: [
                    'periode_id' => $periode->id,
                    'nama' => $periode->nama,
                    'tahun_mulai' => $periode->tahun_mulai,
                    'tahun_selesai' => $periode->tahun_selesai,
                    'tahun_aktif' => $initialActiveYear,
                    'status' => $statusDb,
                ],
                auditableType: PeriodePerencanaan::class,
                auditableId: $periode->id
            );

            return response()->json([
                'message' => "Siklus Perencanaan {$periode->nama} berhasil dibuat beserta slot tahun evaluasinya.",
                'data' => $periode->load('tahunPenilaians'),
            ], 201);
        });
    }

    /**
     * Update an existing Periode Perencanaan (Cycle).
     */
    public function update(Request $request, string $id): JsonResponse
    {
        if (!$request->user()->can('perencanaan.periode')) {
            abort(403, 'Hanya Bapperida / Administrator yang berhak mengubah periode perencanaan.');
        }

        $periode = PeriodePerencanaan::find($id);

        // Fallback for child PeriodePenilaian if passed directly
        if (!$periode) {
            $child = PeriodePenilaian::findOrFail($id);
            $periode = $child->periodePerencanaan;
            if (!$periode) {
                abort(404, 'Siklus periode tidak ditemukan.');
            }
        }

        $validated = $request->validate([
            'nama' => ['nullable', 'string', 'max:150'],
            'keterangan' => ['nullable', 'string'],
            'status' => ['nullable', 'string', 'in:active,inactive,archived,Aktif,Tidak Aktif,Arsip'],
        ]);

        $statusDb = isset($validated['status'])
            ? match ($validated['status']) {
                'Aktif', 'active' => 'active',
                'Arsip', 'archived' => 'archived',
                default => 'inactive',
            }
            : $periode->status;

        return DB::transaction(function () use ($periode, $validated, $statusDb, $request) {
            $oldData = $periode->toArray();

            if ($statusDb === 'active' && $periode->status !== 'active') {
                PeriodePerencanaan::where('id', '!=', $periode->id)->where('status', 'active')->update(['status' => 'inactive']);
            }

            $periode->update([
                'nama' => !empty($validated['nama']) ? trim($validated['nama']) : $periode->nama,
                'status' => $statusDb,
                'keterangan' => $validated['keterangan'] ?? $periode->keterangan,
            ]);

            // Log Audit
            $this->auditLogService->log(
                action: 'PERIODE_PENILAIAN_UPDATED',
                module: 'Perencanaan Kinerja',
                description: "Memperbarui data Siklus Perencanaan: {$periode->nama}",
                user: $request->user(),
                context: [
                    'periode_id' => $periode->id,
                    'old' => $oldData,
                    'new' => $periode->toArray(),
                ],
                auditableType: PeriodePerencanaan::class,
                auditableId: $periode->id
            );

            return response()->json([
                'message' => 'Siklus perencanaan berhasil diperbarui.',
                'data' => $periode->fresh(['tahunPenilaians']),
            ]);
        });
    }

    /**
     * 1-Click Switcher: Activate a specific evaluation year under a cycle.
     */
    public function activateYear(Request $request, string $periodeId, string $tahunId): JsonResponse
    {
        if (!$request->user()->can('perencanaan.periode')) {
            abort(403, 'Hanya Bapperida / Administrator yang berhak mengaktifkan tahun penilaian.');
        }

        $targetYear = PeriodePenilaian::where('id', $tahunId)->first();
        if (!$targetYear) {
            // Also allow matching by integer year e.g. /activate-year/2027
            if (is_numeric($tahunId)) {
                $targetYear = PeriodePenilaian::where('tahun', (int) $tahunId)
                    ->where('periode_perencanaan_id', $periodeId)
                    ->first();
            }
        }

        if (!$targetYear) {
            abort(404, 'Tahun penilaian yang dipilih tidak ditemukan.');
        }

        $parent = $targetYear->periodePerencanaan ?? PeriodePerencanaan::find($periodeId);

        return DB::transaction(function () use ($targetYear, $parent, $request) {
            // Deactivate all previously active evaluation years & planning cycles
            PeriodePenilaian::where('status', 'active')->update(['status' => 'inactive']);
            PeriodePerencanaan::where('status', 'active')->update(['status' => 'inactive']);

            // Activate target year
            $targetYear->update(['status' => 'active']);

            // Ensure parent cycle is marked active
            if ($parent) {
                $parent->update(['status' => 'active']);
            }

            // Log Audit
            $this->auditLogService->log(
                action: 'PERIODE_PENILAIAN_ACTIVATED',
                module: 'Perencanaan Kinerja',
                description: "Mengaktifkan Tahun Penilaian {$targetYear->tahun} ({$parent?->nama}) sebagai Tahun Aktif Global Penilaian Risiko",
                user: $request->user(),
                context: [
                    'periode_perencanaan_id' => $parent?->id,
                    'tahun_penilaian_id' => $targetYear->id,
                    'tahun' => $targetYear->tahun,
                    'cycle' => $parent?->rentang_tahun,
                ],
                auditableType: PeriodePenilaian::class,
                auditableId: $targetYear->id
            );

            return response()->json([
                'message' => "Tahun Penilaian {$targetYear->tahun} ({$parent?->nama}) berhasil dijadikan sebagai Tahun Aktif Global.",
                'data' => [
                    'active_year' => $targetYear->fresh(),
                    'cycle' => $parent?->fresh(['tahunPenilaians']),
                ],
            ]);
        });
    }

    /**
     * Activate an entire cycle or year (backward compatible endpoint).
     */
    public function activate(Request $request, string $id): JsonResponse
    {
        if (!$request->user()->can('perencanaan.periode')) {
            abort(403, 'Hanya Bapperida / Administrator yang berhak mengaktifkan periode penilaian.');
        }

        // Check if ID is a PeriodePerencanaan (Parent)
        $parent = PeriodePerencanaan::with('tahunPenilaians')->find($id);

        if ($parent) {
            // Find first year or year matching current year
            $currYear = (int) date('Y');
            $targetYear = $parent->tahunPenilaians->firstWhere('tahun', $currYear)
                ?? $parent->tahunPenilaians->first();

            if (!$targetYear) {
                abort(422, 'Siklus ini tidak memiliki tahun evaluasi.');
            }

            return $this->activateYear($request, $parent->id, $targetYear->id);
        }

        // If ID is child PeriodePenilaian
        $child = PeriodePenilaian::findOrFail($id);
        return $this->activateYear($request, $child->periode_perencanaan_id ?: $child->id, $child->id);
    }

    /**
     * Update status (active, inactive, archived) of a cycle or year.
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        if (!$request->user()->can('perencanaan.periode')) {
            abort(403, 'Hanya Bapperida / Administrator yang berhak mengubah status.');
        }

        $statusInput = $request->input('status', 'active');
        $statusDb = match ($statusInput) {
            'Aktif', 'active' => 'active',
            'Arsip', 'archived' => 'archived',
            default => 'inactive',
        };

        $cycle = PeriodePerencanaan::find($id);
        if ($cycle) {
            if ($statusDb === 'active') {
                return $this->activate($request, $cycle->id);
            }

            $cycle->update(['status' => $statusDb]);
            return response()->json([
                'message' => "Status siklus {$cycle->nama} diubah menjadi {$statusDb}.",
                'data' => $cycle->fresh(['tahunPenilaians']),
            ]);
        }

        $child = PeriodePenilaian::findOrFail($id);
        if ($statusDb === 'active') {
            return $this->activateYear($request, $child->periode_perencanaan_id ?: $child->id, $child->id);
        }

        $child->update(['status' => $statusDb]);
        return response()->json([
            'message' => "Status tahun {$child->tahun} diubah menjadi {$statusDb}.",
            'data' => $child->fresh(),
        ]);
    }

    /**
     * Delete a planning cycle.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        if (!$request->user()->can('perencanaan.periode')) {
            abort(403, 'Hanya Bapperida / Administrator yang berhak menghapus periode perencanaan.');
        }

        $cycle = PeriodePerencanaan::with('tahunPenilaians')->find($id);

        if (!$cycle) {
            // Check if it's single child
            $child = PeriodePenilaian::find($id);
            if ($child) {
                if ($child->tujuans()->count() > 0 || $child->renstraPrograms()->count() > 0) {
                    return response()->json([
                        'message' => "Tidak dapat menghapus Tahun {$child->tahun} karena sudah memiliki data cascading Tujuan/Sasaran atau Renstra SKPD.",
                    ], 422);
                }

                $child->delete();
                return response()->json(['message' => 'Tahun penilaian berhasil dihapus.']);
            }
            abort(404, 'Periode tidak ditemukan.');
        }

        // Check if ANY child year has cascading data
        foreach ($cycle->tahunPenilaians as $year) {
            if ($year->tujuans()->count() > 0 || $year->renstraPrograms()->count() > 0) {
                return response()->json([
                    'message' => "Tidak dapat menghapus siklus '{$cycle->nama}' karena Tahun {$year->tahun} sudah memiliki data Cascading (Tujuan/Sasaran) atau Renstra SKPD.",
                ], 422);
            }
        }

        return DB::transaction(function () use ($cycle, $request) {
            $deletedName = $cycle->nama;
            $deletedId = $cycle->id;

            // Cascade delete will delete children
            $cycle->tahunPenilaians()->delete();
            $cycle->delete();

            // Log Audit
            $this->auditLogService->log(
                action: 'PERIODE_PENILAIAN_DELETED',
                module: 'Perencanaan Kinerja',
                description: "Menghapus Siklus Perencanaan: {$deletedName}",
                user: $request->user(),
                context: [
                    'periode_id' => $deletedId,
                    'nama' => $deletedName,
                ],
                auditableType: PeriodePerencanaan::class,
                auditableId: $deletedId
            );

            return response()->json([
                'message' => "Siklus perencanaan '{$deletedName}' berhasil dihapus.",
            ]);
        });
    }
}
