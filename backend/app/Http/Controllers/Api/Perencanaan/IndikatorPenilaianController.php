<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Perencanaan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Perencanaan\CopyIndikatorPenilaianRequest;
use App\Http\Requests\Perencanaan\StoreIndikatorPenilaianRequest;
use App\Http\Requests\Perencanaan\UpdateIndikatorPenilaianRequest;
use App\Http\Resources\Perencanaan\IndikatorPenilaianResource;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Services\Perencanaan\IndikatorPenilaianService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IndikatorPenilaianController extends Controller
{
    public function __construct(
        protected IndikatorPenilaianService $indikatorService
    ) {}

    /**
     * Display a listing of indicators / IKU.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data IKU & Indikator perencanaan.');
        }

        $filters = $request->only([
            'search',
            'opd_id',
            'tujuan_penilaian_id',
            'sasaran_penilaian_id',
            'periode_penilaian_id',
            'jenis',
        ]);

        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor'])) {
            $filters['opd_id'] = (string) $user->opd_id;
        }

        // Fast unpaginated query (dropdown or cascading)
        if ($request->boolean('all') || $request->input('paginate') === 'false') {
            $items = $this->indikatorService->getAllIndikator($filters);
            return response()->json([
                'data' => IndikatorPenilaianResource::collection($items),
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $sortBy = (string) $request->input('sort_by', 'urutan');
        $sortDirection = (string) $request->input('sort_direction', 'asc');

        $paginated = $this->indikatorService->getPaginatedIndikator($filters, $perPage, $sortBy, $sortDirection);

        return response()->json([
            'data' => IndikatorPenilaianResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Get KPI statistics for indicators / IKU.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat statistik IKU & Indikator.');
        }

        $periodeId = $request->input('periode_penilaian_id');
        $stats = $this->indikatorService->getStats($periodeId);

        return response()->json($stats);
    }

    /**
     * Store a newly created indicator / IKU.
     */
    public function store(StoreIndikatorPenilaianRequest $request): JsonResponse
    {
        $indikator = $this->indikatorService->createIndikator(
            $request->validated(),
            $request->user()
        );

        $label = $indikator->jenis === 'IKU' ? 'Indikator Kinerja Utama (IKU)' : 'Indikator Renstra';

        return response()->json([
            'message' => "{$label} OPD berhasil ditambahkan.",
            'data' => new IndikatorPenilaianResource($indikator),
        ], 201);
    }

    /**
     * Display the specified indicator.
     */
    public function show(Request $request, IndikatorPenilaian $iku): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat rincian IKU & Indikator.');
        }

        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor']) && $iku->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat rincian IKU & Indikator OPD lain.');
        }

        $loaded = $this->indikatorService->getIndikatorById((string) $iku->id);

        return response()->json([
            'data' => new IndikatorPenilaianResource($loaded),
        ]);
    }

    /**
     * Update the specified indicator.
     */
    public function update(UpdateIndikatorPenilaianRequest $request, IndikatorPenilaian $iku): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor']) && $iku->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah IKU/Indikator OPD lain.');
        }

        $updated = $this->indikatorService->updateIndikator($iku, $request->validated());
        $label = $updated->jenis === 'IKU' ? 'Indikator Kinerja Utama (IKU)' : 'Indikator Renstra';

        return response()->json([
            'message' => "{$label} OPD berhasil diperbarui.",
            'data' => new IndikatorPenilaianResource($updated),
        ]);
    }

    /**
     * Remove the specified indicator from storage.
     */
    public function destroy(Request $request, IndikatorPenilaian $iku): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus data IKU & Indikator.');
        }

        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor']) && $iku->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus IKU/Indikator OPD lain.');
        }

        $label = $iku->jenis === 'IKU' ? 'Indikator Kinerja Utama (IKU)' : 'Indikator Renstra';
        $this->indikatorService->deleteIndikator($iku);

        return response()->json([
            'message' => "{$label} OPD berhasil dihapus.",
        ]);
    }

    /**
     * Copy indicators / IKU from another period into current active period.
     */
    public function copy(CopyIndikatorPenilaianRequest $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $validated = $request->validated();
        $targetOpdId = ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor']))
            ? (string) $user->opd_id
            : ($validated['opd_id'] ?? null);

        $count = $this->indikatorService->copyFromPeriode(
            (string) $validated['source_periode_id'],
            $targetOpdId,
            $validated['sasaran_penilaian_id'] ?? null,
            $validated['jenis'] ?? null,
            $request->user()
        );

        return response()->json([
            'message' => "Berhasil menyalin {$count} data indikator kinerja ke periode aktif.",
            'copied_count' => $count,
        ]);
    }

    /**
     * Export indicators to Excel (.xlsx).
     */
    public function export(Request $request): StreamedResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor data IKU & Indikator.');
        }

        $filters = $request->only([
            'search',
            'opd_id',
            'tujuan_penilaian_id',
            'sasaran_penilaian_id',
            'periode_penilaian_id',
            'jenis',
        ]);

        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor'])) {
            $filters['opd_id'] = (string) $user->opd_id;
        }

        return $this->indikatorService->exportIndikator($filters);
    }

    /**
     * Reorder indicators within their parent target scope.
     */
    public function reorder(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah urutan indikator kinerja.');
        }

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:indikator_penilaians,id'],
        ]);

        $items = IndikatorPenilaian::whereIn('id', $validated['ids'])->get();
        if ($items->count() !== count($validated['ids'])) {
            abort(422, 'Sebagian data indikator tidak ditemukan.');
        }

        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor'])) {
            foreach ($items as $item) {
                if ($item->opd_id !== $user->opd_id) {
                    abort(403, 'Anda tidak memiliki hak akses untuk mengubah urutan IKU/Indikator OPD lain.');
                }
            }
        }

        $distinctOpds = $items->pluck('opd_id')->unique();
        if ($distinctOpds->count() > 1) {
            abort(422, 'Semua indikator yang diurutkan harus berasal dari Perangkat Daerah (OPD) yang sama.');
        }

        $this->indikatorService->reorderIndikator($validated['ids']);

        return response()->json([
            'message' => 'Urutan indikator kinerja berhasil diperbarui.',
        ]);
    }
}
