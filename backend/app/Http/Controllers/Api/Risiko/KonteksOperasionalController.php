<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\SaveKonteksOperasionalItemRequest;
use App\Http\Requests\Risiko\SaveKonteksOperasionalRequest;
use App\Http\Resources\Risiko\KonteksOperasionalItemResource;
use App\Http\Resources\Risiko\KonteksOperasionalResource;
use App\Models\Risiko\KonteksOperasional;
use App\Services\Risiko\KonteksOperasionalService;
use App\Services\Risiko\PengajuanRisikoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class KonteksOperasionalController extends Controller
{
    public function __construct(
        protected KonteksOperasionalService $service,
        protected PengajuanRisikoService $pengajuanService
    ) {}

    /**
     * Display a listing of operational context assessments (Form 2C).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_operasional.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat penetapan konteks risiko operasional.');
        }

        $filters = $request->only(['periode_penilaian_id', 'opd_id', 'status', 'search']);

        // Scope to user's OPD if role is OPD
        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office'])) {
            $filters['opd_id'] = $user->opd_id;
        }

        // Auditors may only list OPDs they are assigned to
        if ($user->isScopedAuditor()) {
            $assigned = $user->activeAssignedOpdIds();
            if (!empty($filters['opd_id'])) {
                if (!in_array((string) $filters['opd_id'], $assigned, true)) {
                    abort(403, 'Anda tidak ditugaskan sebagai auditor pada perangkat daerah ini.');
                }
            } else {
                $filters['opd_ids'] = $assigned;
            }
        }

        $perPage = (int) $request->get('per_page', 10);
        $sortBy = (string) $request->get('sort_by', 'created_at');
        $sortDir = (string) $request->get('sort_direction', 'desc');

        $paginator = $this->service->getPaginatedKonteks($filters, $perPage, $sortBy, $sortDir);

        return response()->json([
            'data' => KonteksOperasionalResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * Get current OPD operational context assessment for active period.
     */
    public function current(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_operasional.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat penetapan konteks risiko operasional.');
        }

        $targetOpdId = $request->get('opd_id');

        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office'])) {
            $targetOpdId = $user->opd_id;
        }

        if ($user->isScopedAuditor() && !empty($targetOpdId) && !$user->canReadOpdData((string) $targetOpdId)) {
            abort(403, 'Anda tidak ditugaskan sebagai auditor pada perangkat daerah ini.');
        }

        if (empty($targetOpdId)) {
            return response()->json([
                'data' => null,
                'message' => 'OPD ID belum ditentukan.',
            ], 200);
        }

        $konteks = $this->service->getKonteksByOpd($targetOpdId, $request->get('periode_penilaian_id'));

        return response()->json([
            'data' => $konteks ? new KonteksOperasionalResource($konteks) : null,
        ]);
    }

    /**
     * Store or update operational context assessment (Form 2C).
     */
    public function store(SaveKonteksOperasionalRequest $request): JsonResponse
    {
        $data = $request->validated();
        $this->pengajuanService->assertOpdCanEdit((string) $data['opd_id'], $data['periode_penilaian_id'] ?? null, $request->user(), '2c');

        $konteks = $this->service->saveKonteks($data, $request->user());

        return response()->json([
            'message' => 'Penetapan Konteks Risiko Operasional OPD (Form 2C) berhasil disimpan.',
            'data' => new KonteksOperasionalResource($konteks),
        ], 201);
    }

    /**
     * Display the specified operational context assessment.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_operasional.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat penetapan konteks risiko operasional.');
        }

        $konteks = $this->service->getKonteksById($id);
        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office']) && $konteks->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat konteks risiko operasional OPD lain.');
        }
        if (!$user->canReadOpdData((string) $konteks->opd_id)) {
            abort(403, 'Anda tidak ditugaskan sebagai auditor pada perangkat daerah ini.');
        }

        return response()->json([
            'data' => new KonteksOperasionalResource($konteks),
        ]);
    }

    /**
     * Update the specified operational context assessment.
     */
    public function update(SaveKonteksOperasionalRequest $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_operasional.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah penetapan konteks risiko operasional.');
        }

        $konteks = $this->service->getKonteksById($id);
        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office']) && $konteks->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah konteks risiko operasional OPD lain.');
        }

        $this->pengajuanService->assertOpdCanEdit((string) $konteks->opd_id, (string) $konteks->periode_penilaian_id, $user, '2c');

        $data = $request->validated();
        $data['opd_id'] = $konteks->opd_id;
        $data['periode_penilaian_id'] = $konteks->periode_penilaian_id;
        $updated = $this->service->saveKonteks($data, $request->user());

        return response()->json([
            'message' => 'Penetapan Konteks Risiko Operasional OPD (Form 2C) berhasil diperbarui.',
            'data' => new KonteksOperasionalResource($updated),
        ]);
    }

    /**
     * Remove the specified operational context assessment.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_operasional.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus penetapan konteks risiko operasional.');
        }

        $konteks = $this->service->getKonteksById($id);
        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office']) && $konteks->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus konteks risiko operasional OPD lain.');
        }

        $this->pengajuanService->assertOpdCanEdit((string) $konteks->opd_id, (string) $konteks->periode_penilaian_id, $user, '2c');

        $this->service->deleteKonteks($konteks);

        return response()->json([
            'message' => 'Penetapan Konteks Risiko Operasional OPD (Form 2C) berhasil dihapus.',
        ]);
    }

    /**
     * Reorder operational items within Form 2C and auto-recalculate sequential codes.
     */
    public function reorderItems(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_operasional.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah urutan rincian operasional Form 2C.');
        }

        $konteks = $this->service->getKonteksById($id);
        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office']) && $konteks->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah konteks risiko operasional OPD lain.');
        }

        $this->pengajuanService->assertOpdCanEdit((string) $konteks->opd_id, (string) $konteks->periode_penilaian_id, $user, '2c');

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => [
                'required',
                'uuid',
                Rule::exists('konteks_operasional_items', 'id')->where('konteks_operasional_id', $konteks->id),
            ],
        ]);

        $this->service->reorderItems($konteks, $validated['ids']);

        return response()->json([
            'message' => 'Urutan rincian operasional Form 2C berhasil diperbarui.',
            'data' => new KonteksOperasionalResource($konteks->fresh(['programs.indikators', 'programs.children.indikators', 'programs.children.children.indikators'])),
        ]);
    }

    /**
     * Store a new item (Program, Kegiatan, or Sub-Kegiatan) in Form 2C.
     */
    public function storeItem(SaveKonteksOperasionalItemRequest $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_operasional.create') && !$user?->can('konteks_operasional.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menambah rincian operasional Form 2C.');
        }

        $konteks = $this->service->getKonteksById($id);
        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office']) && $konteks->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah konteks risiko operasional OPD lain.');
        }

        $this->pengajuanService->assertOpdCanEdit((string) $konteks->opd_id, (string) $konteks->periode_penilaian_id, $user, '2c');

        $data = $request->validated();
        $item = $this->service->saveItem($konteks, $data);

        return response()->json([
            'message' => 'Rincian operasional Form 2C berhasil ditambahkan.',
            'data' => new KonteksOperasionalItemResource($item),
        ], 201);
    }

    /**
     * Update an item (Program, Kegiatan, or Sub-Kegiatan) in Form 2C.
     */
    public function updateItem(SaveKonteksOperasionalItemRequest $request, string $id, string $itemId): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_operasional.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah rincian operasional Form 2C.');
        }

        $konteks = $this->service->getKonteksById($id);
        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office']) && $konteks->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah konteks risiko operasional OPD lain.');
        }

        $this->pengajuanService->assertOpdCanEdit((string) $konteks->opd_id, (string) $konteks->periode_penilaian_id, $user, '2c');

        $data = $request->validated();
        $item = $this->service->saveItem($konteks, $data, $itemId);

        return response()->json([
            'message' => 'Rincian operasional Form 2C berhasil diperbarui.',
            'data' => new KonteksOperasionalItemResource($item),
        ]);
    }

    /**
     * Delete an item (Program, Kegiatan, or Sub-Kegiatan) from Form 2C.
     */
    public function destroyItem(Request $request, string $id, string $itemId): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_operasional.edit') && !$user?->can('konteks_operasional.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus rincian operasional Form 2C.');
        }

        $konteks = $this->service->getKonteksById($id);
        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office']) && $konteks->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus rincian operasional OPD lain.');
        }

        $this->pengajuanService->assertOpdCanEdit((string) $konteks->opd_id, (string) $konteks->periode_penilaian_id, $user, '2c');

        $this->service->deleteItem($konteks, $itemId);

        return response()->json([
            'message' => 'Rincian operasional Form 2C berhasil dihapus.',
        ]);
    }

    /**
     * Export Form 2C to Excel (.xlsx).
     */
    public function export(Request $request, string $id): StreamedResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_operasional.export') && !$user?->can('konteks_operasional.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor penetapan konteks risiko operasional.');
        }

        $konteks = $this->service->getKonteksById($id);
        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office']) && $konteks->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor konteks risiko operasional OPD lain.');
        }
        if ($user && !$user->canReadOpdData((string) $konteks->opd_id)) {
            abort(403, 'Anda tidak ditugaskan sebagai auditor pada perangkat daerah ini.');
        }

        return $this->service->exportExcel($konteks);
    }
}
