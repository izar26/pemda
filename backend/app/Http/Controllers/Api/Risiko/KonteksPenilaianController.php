<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\SaveKonteksPenilaianRequest;
use App\Http\Resources\Risiko\KonteksPenilaianResource;
use App\Models\Risiko\KonteksPenilaian;
use App\Services\Risiko\KonteksPenilaianService;
use App\Services\Risiko\PengajuanRisikoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class KonteksPenilaianController extends Controller
{
    public function __construct(
        protected KonteksPenilaianService $service,
        protected PengajuanRisikoService $pengajuanService
    ) {}

    /**
     * Display a listing of context assessments (Form 2B).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_risiko.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat penetapan konteks risiko.');
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
            'data' => KonteksPenilaianResource::collection($paginator->items()),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
        ]);
    }

    /**
     * Get current OPD context assessment for active period.
     */
    public function current(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_risiko.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat penetapan konteks risiko.');
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

        $periodeId = $request->get('periode_penilaian_id');
        $konteks = $this->service->getKonteksByOpd($targetOpdId, $periodeId);
        $meta = $this->service->getOpdMeta($targetOpdId, $periodeId);

        return response()->json([
            'data' => $konteks ? new KonteksPenilaianResource($konteks) : null,
            'meta' => $meta,
        ]);
    }

    /**
     * Store or update context assessment (Form 2B).
     */
    public function store(SaveKonteksPenilaianRequest $request): JsonResponse
    {
        $data = $request->validated();
        $this->pengajuanService->assertOpdCanEdit((string) $data['opd_id'], $data['periode_penilaian_id'] ?? null, $request->user(), '2b');

        $konteks = $this->service->saveKonteks($data, $request->user());
        $meta = $this->service->getOpdMeta((string) $konteks->opd_id, (string) $konteks->periode_penilaian_id);

        return response()->json([
            'message' => 'Penetapan Konteks Risiko Strategis OPD (Form 2B) berhasil disimpan.',
            'data' => new KonteksPenilaianResource($konteks),
            'meta' => $meta,
        ], 201);
    }

    /**
     * Display the specified context assessment.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_risiko.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat penetapan konteks risiko.');
        }

        $konteks = $this->service->getKonteksById($id);
        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office']) && $konteks->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat konteks risiko OPD lain.');
        }
        if (!$user->canReadOpdData((string) $konteks->opd_id)) {
            abort(403, 'Anda tidak ditugaskan sebagai auditor pada perangkat daerah ini.');
        }

        return response()->json([
            'data' => new KonteksPenilaianResource($konteks),
            'meta' => $this->service->getOpdMeta((string) $konteks->opd_id, (string) $konteks->periode_penilaian_id),
        ]);
    }

    /**
     * Update the specified context assessment.
     */
    public function update(SaveKonteksPenilaianRequest $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_risiko.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah penetapan konteks risiko.');
        }

        $konteks = $this->service->getKonteksById($id);
        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office']) && $konteks->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah konteks risiko OPD lain.');
        }

        $this->pengajuanService->assertOpdCanEdit((string) $konteks->opd_id, (string) $konteks->periode_penilaian_id, $user, '2b');

        $data = $request->validated();
        $data['opd_id'] = $konteks->opd_id;
        $data['periode_penilaian_id'] = $konteks->periode_penilaian_id;
        $updated = $this->service->saveKonteks($data, $request->user());

        return response()->json([
            'message' => 'Penetapan Konteks Risiko Strategis OPD (Form 2B) berhasil diperbarui.',
            'data' => new KonteksPenilaianResource($updated),
            'meta' => $this->service->getOpdMeta((string) $updated->opd_id, (string) $updated->periode_penilaian_id),
        ]);
    }

    /**
     * Remove the specified context assessment.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_risiko.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus penetapan konteks risiko.');
        }

        $konteks = $this->service->getKonteksById($id);
        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office']) && $konteks->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus konteks risiko OPD lain.');
        }

        $this->pengajuanService->assertOpdCanEdit((string) $konteks->opd_id, (string) $konteks->periode_penilaian_id, $user, '2b');

        $this->service->deleteKonteks($konteks);

        return response()->json([
            'message' => 'Penetapan Konteks Risiko Strategis OPD (Form 2B) berhasil dihapus.',
        ]);
    }

    /**
     * Export Form 2B to Excel (.xlsx).
     */
    public function export(Request $request, string $id): StreamedResponse
    {
        $user = $request->user();
        if (!$user?->can('konteks_risiko.export') && !$user?->can('konteks_risiko.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor penetapan konteks risiko.');
        }

        $konteks = $this->service->getKonteksById($id);
        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office']) && $konteks->opd_id !== $user->opd_id) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor konteks risiko OPD lain.');
        }
        if ($user && !$user->canReadOpdData((string) $konteks->opd_id)) {
            abort(403, 'Anda tidak ditugaskan sebagai auditor pada perangkat daerah ini.');
        }

        return $this->service->exportExcel($konteks);
    }
}
