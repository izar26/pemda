<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Services\Risiko\PengajuanRisikoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PengajuanRisikoController extends Controller
{
    public function __construct(
        protected PengajuanRisikoService $service
    ) {}

    /**
     * Get readiness & submission status for OPD risk forms.
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $targetOpdId = $request->get('opd_id');

        // OPD role can only check their own OPD
        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat', 'Auditor'])) {
            $targetOpdId = $user->opd_id;
        }

        if (empty($targetOpdId)) {
            return response()->json([
                'data' => null,
                'message' => 'OPD ID belum ditentukan.',
            ], 200);
        }

        $periodeId = $request->get('periode_penilaian_id');
        $readiness = $this->service->checkReadiness((string) $targetOpdId, $periodeId);

        return response()->json(['data' => $readiness]);
    }

    /**
     * Submit completed risk forms to assigned auditor.
     */
    public function submit(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('penilaian_risiko.submit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengajukan lembar kerja risiko.');
        }

        $targetOpdId = $request->input('opd_id');
        if ($user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office'])) {
            $targetOpdId = $user->opd_id;
        }

        if (empty($targetOpdId)) {
            return response()->json([
                'message' => 'Perangkat daerah belum ditentukan.',
            ], 422);
        }

        $periodeId = $request->input('periode_penilaian_id');
        $catatan = $request->input('catatan');

        $submission = $this->service->submitForReview(
            (string) $targetOpdId,
            $periodeId ? (string) $periodeId : null,
            $user,
            $catatan ? (string) $catatan : null
        );

        return response()->json([
            'message' => 'Seluruh lembar kerja risiko berhasil dikirimkan kepada Auditor Pengawas untuk ditinjau.',
            'data' => $submission,
        ]);
    }

    /**
     * Get list of OPD risk submissions for an auditor or inspectorate.
     */
    public function indexReviews(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('review_risiko.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat daftar review risiko OPD.');
        }

        $perPage = (int) $request->input('per_page', 15);
        $filters = $request->only(['search', 'status', 'periode_penilaian_id', 'auditor_id']);

        $paginated = $this->service->getAuditorReviewList($user, $filters, $perPage);

        return response()->json([
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Get review detail of an OPD submission.
     */
    public function showReview(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('review_risiko.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat detail review risiko.');
        }

        $submission = $this->service->getSubmissionDetail($id, $user);

        return response()->json(['data' => $submission]);
    }

    /**
     * Review a specific form item (Approve or Reject with mandatory revision notes).
     */
    public function reviewItem(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$user?->can('review_risiko.approve')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menyetujui atau menolak lembar kerja risiko.');
        }

        $validated = $request->validate([
            'form_code' => ['required', 'string', 'in:2b,2c'],
            'status' => ['required', 'string', 'in:approved,rejected'],
            'catatan_revisi' => ['nullable', 'string', 'max:2000'],
        ]);

        $item = $this->service->reviewItem(
            $id,
            $validated['form_code'],
            $validated['status'],
            $validated['catatan_revisi'] ?? null,
            $user
        );

        $actionText = $validated['status'] === 'approved' ? 'disetujui' : 'ditolak (dikembalikan untuk revisi)';

        return response()->json([
            'message' => "Form {$validated['form_code']} berhasil {$actionText}.",
            'data' => $item,
        ]);
    }
}
