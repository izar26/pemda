<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Perencanaan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Perencanaan\StorePeriodePenilaianRequest;
use App\Http\Requests\Perencanaan\UpdatePeriodePenilaianRequest;
use App\Http\Resources\Perencanaan\PeriodePenilaianResource;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Services\Perencanaan\PeriodePenilaianService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PeriodePenilaianController extends Controller
{
    public function __construct(
        protected PeriodePenilaianService $periodeService
    ) {}

    /**
     * Display a listing of evaluation periods.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('periode.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data periode penilaian.');
        }

        $filters = $request->only(['search', 'status', 'tahun_penilaian']);

        // Fast dropdown query (unpaginated)
        if ($request->boolean('all') || $request->input('paginate') === 'false') {
            $periodes = $this->periodeService->getAllPeriodes($filters);
            return response()->json([
                'data' => PeriodePenilaianResource::collection($periodes),
            ]);
        }

        // Paginated query
        $perPage = (int) $request->input('per_page', 10);
        $sortBy = (string) $request->input('sort_by', 'tahun_penilaian');
        $sortDirection = (string) $request->input('sort_direction', 'desc');

        $paginated = $this->periodeService->getPaginatedPeriodes($filters, $perPage, $sortBy, $sortDirection);

        return response()->json([
            'data' => PeriodePenilaianResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Get the single currently active period.
     */
    public function active(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('periode.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat periode aktif.');
        }

        $active = $this->periodeService->getActivePeriode();

        return response()->json([
            'data' => $active ? new PeriodePenilaianResource($active) : null,
        ]);
    }

    /**
     * Get summary KPI statistics for evaluation periods.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('periode.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat statistik periode penilaian.');
        }

        $stats = $this->periodeService->getStats();

        return response()->json($stats);
    }

    /**
     * Store a newly created evaluation period.
     */
    public function store(StorePeriodePenilaianRequest $request): JsonResponse
    {
        $periode = $this->periodeService->createPeriode(
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'Periode penilaian berhasil ditambahkan.',
            'data' => new PeriodePenilaianResource($periode),
        ], 201);
    }

    /**
     * Display the specified evaluation period.
     */
    public function show(Request $request, PeriodePenilaian $periode): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('periode.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat rincian periode penilaian.');
        }

        $loaded = $this->periodeService->getPeriodeById((string) $periode->id);

        return response()->json([
            'data' => new PeriodePenilaianResource($loaded),
        ]);
    }

    /**
     * Update the specified evaluation period.
     */
    public function update(UpdatePeriodePenilaianRequest $request, PeriodePenilaian $periode): JsonResponse
    {
        $updated = $this->periodeService->updatePeriode($periode, $request->validated());

        return response()->json([
            'message' => 'Periode penilaian berhasil diperbarui.',
            'data' => new PeriodePenilaianResource($updated),
        ]);
    }

    /**
     * Directly activate a specific evaluation period.
     */
    public function activate(Request $request, PeriodePenilaian $periode): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('periode.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengaktifkan periode penilaian.');
        }

        $activated = $this->periodeService->activatePeriode($periode);

        return response()->json([
            'message' => "Periode penilaian {$activated->nama_periode} (Tahun {$activated->tahun_penilaian}) berhasil diaktifkan.",
            'data' => new PeriodePenilaianResource($activated),
        ]);
    }

    /**
     * Switch the active evaluation year within the RPJMD cycle.
     */
    public function switchTahun(Request $request, PeriodePenilaian $periode): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('periode.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah tahun penilaian aktif.');
        }

        $validated = $request->validate([
            'tahun_penilaian' => ['required', 'integer', 'min:2000', 'max:2100'],
        ]);

        $updated = $this->periodeService->switchTahun($periode, (int) $validated['tahun_penilaian']);

        return response()->json([
            'message' => "Tahun penilaian berhasil diubah ke {$updated->tahun_penilaian} ({$updated->nama_periode}).",
            'data' => new PeriodePenilaianResource($updated),
        ]);
    }

    /**
     * Remove the specified evaluation period from storage.
     */
    public function destroy(Request $request, PeriodePenilaian $periode): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('periode.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus periode penilaian.');
        }

        $this->periodeService->deletePeriode($periode);

        return response()->json([
            'message' => 'Periode penilaian berhasil dihapus.',
        ]);
    }

    /**
     * Export evaluation periods to Excel (.xlsx) via high-performance streaming.
     */
    public function export(Request $request): StreamedResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('periode.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor data periode penilaian.');
        }

        $filters = $request->only(['search', 'status', 'tahun_penilaian']);

        return $this->periodeService->exportPeriodes($filters);
    }
}
