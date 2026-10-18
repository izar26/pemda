<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Perencanaan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Perencanaan\CopyTujuanPenilaianRequest;
use App\Http\Requests\Perencanaan\StoreTujuanPenilaianRequest;
use App\Http\Requests\Perencanaan\UpdateTujuanPenilaianRequest;
use App\Http\Resources\Perencanaan\TujuanPenilaianResource;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Services\Perencanaan\TujuanPenilaianService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TujuanPenilaianController extends Controller
{
    public function __construct(
        protected TujuanPenilaianService $tujuanService
    ) {}

    /**
     * Display a listing of evaluation goals.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data tujuan perencanaan.');
        }

        $filters = $request->only(['search', 'opd_id', 'periode_penilaian_id', 'sumber_data_id']);

        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor'])) {
            $filters['opd_id'] = (string) $user->opd_id;
        }

        // Fast unpaginated query (dropdown)
        if ($request->boolean('all') || $request->input('paginate') === 'false') {
            $items = $this->tujuanService->getAllTujuan($filters);
            return response()->json([
                'data' => TujuanPenilaianResource::collection($items),
            ]);
        }

        $perPage = (int) $request->input('per_page', 10);
        $sortBy = (string) $request->input('sort_by', 'urutan');
        $sortDirection = (string) $request->input('sort_direction', 'asc');

        $paginated = $this->tujuanService->getPaginatedTujuan($filters, $perPage, $sortBy, $sortDirection);

        return response()->json([
            'data' => TujuanPenilaianResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Get KPI statistics for evaluation goals.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat statistik tujuan perencanaan.');
        }

        $periodeId = $request->input('periode_penilaian_id');
        $stats = $this->tujuanService->getStats($periodeId);

        return response()->json($stats);
    }

    /**
     * Store a newly created evaluation goal.
     */
    public function store(StoreTujuanPenilaianRequest $request): JsonResponse
    {
        $tujuan = $this->tujuanService->createTujuan(
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'Tujuan strategis Renstra OPD berhasil ditambahkan.',
            'data' => new TujuanPenilaianResource($tujuan),
        ], 201);
    }

    /**
     * Display the specified evaluation goal.
     */
    public function show(Request $request, TujuanPenilaian $tujuan): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat rincian tujuan perencanaan.');
        }

        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor']) && $tujuan->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat rincian Tujuan Renstra OPD lain.');
        }

        $loaded = $this->tujuanService->getTujuanById((string) $tujuan->id);

        return response()->json([
            'data' => new TujuanPenilaianResource($loaded),
        ]);
    }

    /**
     * Update the specified evaluation goal.
     */
    public function update(UpdateTujuanPenilaianRequest $request, TujuanPenilaian $tujuan): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor']) && $tujuan->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah Tujuan Renstra OPD lain.');
        }

        $updated = $this->tujuanService->updateTujuan($tujuan, $request->validated());

        return response()->json([
            'message' => 'Tujuan strategis Renstra OPD berhasil diperbarui.',
            'data' => new TujuanPenilaianResource($updated),
        ]);
    }

    /**
     * Remove the specified evaluation goal from storage.
     */
    public function destroy(Request $request, TujuanPenilaian $tujuan): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus data tujuan perencanaan.');
        }

        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor']) && $tujuan->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus Tujuan Renstra OPD lain.');
        }

        $this->tujuanService->deleteTujuan($tujuan);

        return response()->json([
            'message' => 'Tujuan strategis Renstra OPD berhasil dihapus.',
        ]);
    }

    /**
     * Copy goals from another period into current active period.
     */
    public function copy(CopyTujuanPenilaianRequest $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $validated = $request->validated();
        $targetOpdId = ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor']))
            ? (string) $user->opd_id
            : ($validated['opd_id'] ?? null);

        $count = $this->tujuanService->copyFromPeriode(
            (string) $validated['source_periode_id'],
            $targetOpdId,
            $request->user()
        );

        return response()->json([
            'message' => "Berhasil menyalin {$count} data tujuan strategis ke periode aktif.",
            'copied_count' => $count,
        ]);
    }

    /**
     * Export goals to Excel (.xlsx).
     */
    public function export(Request $request): StreamedResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor data tujuan perencanaan.');
        }

        $filters = $request->only(['search', 'opd_id', 'periode_penilaian_id']);

        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor'])) {
            $filters['opd_id'] = (string) $user->opd_id;
        }

        return $this->tujuanService->exportTujuan($filters);
    }

    /**
     * Reorder evaluation goals within their OPD scope.
     */
    public function reorder(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah urutan tujuan perencanaan.');
        }

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:tujuan_penilaians,id'],
        ]);

        $items = TujuanPenilaian::whereIn('id', $validated['ids'])->get();
        if ($items->count() !== count($validated['ids'])) {
            abort(422, 'Sebagian data tujuan tidak ditemukan.');
        }

        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor'])) {
            foreach ($items as $item) {
                if ($item->opd_id !== $user->opd_id) {
                    abort(403, 'Anda tidak memiliki hak akses untuk mengubah urutan Tujuan Renstra OPD lain.');
                }
            }
        }

        $distinctOpds = $items->pluck('opd_id')->unique();
        if ($distinctOpds->count() > 1) {
            abort(422, 'Semua tujuan yang diurutkan harus berasal dari Perangkat Daerah (OPD) yang sama.');
        }

        $this->tujuanService->reorderTujuan($validated['ids']);

        return response()->json([
            'message' => 'Urutan tujuan strategis berhasil diperbarui.',
        ]);
    }
}
