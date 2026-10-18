<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Perencanaan;

use App\Http\Controllers\Controller;
use App\Http\Requests\Perencanaan\CopySasaranPenilaianRequest;
use App\Http\Requests\Perencanaan\StoreSasaranPenilaianRequest;
use App\Http\Requests\Perencanaan\UpdateSasaranPenilaianRequest;
use App\Http\Resources\Perencanaan\SasaranPenilaianResource;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Services\Perencanaan\SasaranPenilaianService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SasaranPenilaianController extends Controller
{
    public function __construct(
        protected SasaranPenilaianService $sasaranService
    ) {}

    /**
     * Display a listing of strategic targets.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data sasaran perencanaan.');
        }

        $filters = $request->only(['search', 'opd_id', 'tujuan_penilaian_id', 'periode_penilaian_id']);

        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor'])) {
            $filters['opd_id'] = (string) $user->opd_id;
        }

        // Fast unpaginated query (dropdown or cascading)
        if ($request->boolean('all') || $request->input('paginate') === 'false') {
            $items = $this->sasaranService->getAllSasaran($filters);
            return response()->json([
                'data' => SasaranPenilaianResource::collection($items),
            ]);
        }

        $perPage = (int) $request->input('per_page', 15);
        $sortBy = (string) $request->input('sort_by', 'urutan');
        $sortDirection = (string) $request->input('sort_direction', 'asc');

        $paginated = $this->sasaranService->getPaginatedSasaran($filters, $perPage, $sortBy, $sortDirection);

        return response()->json([
            'data' => SasaranPenilaianResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Get KPI statistics for strategic targets.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat statistik sasaran perencanaan.');
        }

        $periodeId = $request->input('periode_penilaian_id');
        $stats = $this->sasaranService->getStats($periodeId);

        return response()->json($stats);
    }

    /**
     * Store a newly created strategic target.
     */
    public function store(StoreSasaranPenilaianRequest $request): JsonResponse
    {
        $sasaran = $this->sasaranService->createSasaran(
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'Sasaran strategis Renstra OPD berhasil ditambahkan.',
            'data' => new SasaranPenilaianResource($sasaran),
        ], 201);
    }

    /**
     * Display the specified strategic target.
     */
    public function show(Request $request, SasaranPenilaian $sasaran): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat rincian sasaran perencanaan.');
        }

        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor']) && $sasaran->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat rincian Sasaran Renstra OPD lain.');
        }

        $loaded = $this->sasaranService->getSasaranById((string) $sasaran->id);

        return response()->json([
            'data' => new SasaranPenilaianResource($loaded),
        ]);
    }

    /**
     * Update the specified strategic target.
     */
    public function update(UpdateSasaranPenilaianRequest $request, SasaranPenilaian $sasaran): JsonResponse
    {
        $user = $request->user();
        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor']) && $sasaran->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah Sasaran Renstra OPD lain.');
        }

        $updated = $this->sasaranService->updateSasaran($sasaran, $request->validated());

        return response()->json([
            'message' => 'Sasaran strategis Renstra OPD berhasil diperbarui.',
            'data' => new SasaranPenilaianResource($updated),
        ]);
    }

    /**
     * Remove the specified strategic target from storage.
     */
    public function destroy(Request $request, SasaranPenilaian $sasaran): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus data sasaran perencanaan.');
        }

        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor']) && $sasaran->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus Sasaran Renstra OPD lain.');
        }

        $this->sasaranService->deleteSasaran($sasaran);

        return response()->json([
            'message' => 'Sasaran strategis Renstra OPD berhasil dihapus.',
        ]);
    }

    /**
     * Copy strategic targets from another period into current active period.
     */
    public function copy(CopySasaranPenilaianRequest $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $validated = $request->validated();
        $targetOpdId = ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor']))
            ? (string) $user->opd_id
            : ($validated['opd_id'] ?? null);

        $count = $this->sasaranService->copyFromPeriode(
            (string) $validated['source_periode_id'],
            $targetOpdId,
            $validated['tujuan_penilaian_id'] ?? null,
            $request->user()
        );

        return response()->json([
            'message' => "Berhasil menyalin {$count} data sasaran strategis ke periode aktif.",
            'copied_count' => $count,
        ]);
    }

    /**
     * Export strategic targets to Excel (.xlsx).
     */
    public function export(Request $request): StreamedResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor data sasaran perencanaan.');
        }

        $filters = $request->only(['search', 'opd_id', 'tujuan_penilaian_id', 'periode_penilaian_id']);

        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor'])) {
            $filters['opd_id'] = (string) $user->opd_id;
        }

        return $this->sasaranService->exportSasaran($filters);
    }

    /**
     * Reorder strategic targets within their parent goal scope.
     */
    public function reorder(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('tujuan.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah urutan sasaran perencanaan.');
        }

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:sasaran_penilaians,id'],
        ]);

        $items = SasaranPenilaian::whereIn('id', $validated['ids'])->get();
        if ($items->count() !== count($validated['ids'])) {
            abort(422, 'Sebagian data sasaran tidak ditemukan.');
        }

        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor'])) {
            foreach ($items as $item) {
                if ($item->opd_id !== $user->opd_id) {
                    abort(403, 'Anda tidak memiliki hak akses untuk mengubah urutan Sasaran Renstra OPD lain.');
                }
            }
        }

        $distinctOpds = $items->pluck('opd_id')->unique();
        if ($distinctOpds->count() > 1) {
            abort(422, 'Semua sasaran yang diurutkan harus berasal dari Perangkat Daerah (OPD) yang sama.');
        }

        $this->sasaranService->reorderSasaran($validated['ids']);

        return response()->json([
            'message' => 'Urutan sasaran strategis berhasil diperbarui.',
        ]);
    }
}
