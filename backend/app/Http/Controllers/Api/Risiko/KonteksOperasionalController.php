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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class KonteksOperasionalController extends Controller
{
    public function __construct(
        protected KonteksOperasionalService $service
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

        $data = $request->validated();
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

        $this->service->deleteKonteks($konteks);

        return response()->json([
            'message' => 'Penetapan Konteks Risiko Operasional OPD (Form 2C) berhasil dihapus.',
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

        return $this->service->exportExcel($konteks);
    }
}
