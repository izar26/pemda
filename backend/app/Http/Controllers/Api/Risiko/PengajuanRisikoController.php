<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\DelegateOperatorRequest;
use App\Http\Requests\Risiko\ForwardRevisionAuditorRequest;
use App\Http\Requests\Risiko\ResubmitPengawasRequest;
use App\Http\Requests\Risiko\ReviewAuditorItemRequest;
use App\Http\Requests\Risiko\ReviewKepalaOpdRequest;
use App\Http\Requests\Risiko\ReviewPengawasItemRequest;
use App\Http\Requests\Risiko\SubmitPengajuanRisikoRequest;
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
        if ($user && $user->hasRole('OPD') && ! $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat', 'Auditor'])) {
            $targetOpdId = $user->opd_id;
        }

        // Executive role with opd_id can only check their own OPD
        if ($user && $user->hasRole('Executive') && ! $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat']) && $user->opd_id) {
            $targetOpdId = $user->opd_id;
        }

        // Auditor can only check OPDs they are assigned to
        if ($user && $user->isScopedAuditor() && ! empty($targetOpdId) && ! $user->canReadOpdData((string) $targetOpdId)) {
            abort(403, 'Anda tidak ditugaskan sebagai auditor pada perangkat daerah ini.');
        }

        if (empty($targetOpdId)) {
            return response()->json([
                'data' => null,
                'message' => 'OPD ID belum ditentukan.',
            ], 200);
        }

        $periodeId = $request->get('periode_penilaian_id');
        $readiness = $this->service->checkReadiness((string) $targetOpdId, $periodeId, $user);

        return response()->json(['data' => $readiness]);
    }

    /**
     * Get real-time pending approval counts for current user.
     */
    public function pendingCounts(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            abort(401);
        }

        $periodeId = $request->get('periode_penilaian_id');
        $counts = $this->service->getPendingCounts($user, $periodeId ? (string) $periodeId : null);

        return response()->json(['data' => $counts]);
    }

    /**
     * Submit completed risk forms from Operator to Kepala OPD.
     */
    public function submit(SubmitPengajuanRisikoRequest $request): JsonResponse
    {
        $user = $request->user();
        $targetOpdId = $request->input('opd_id');
        if ($user && $user->hasRole('OPD') && ! $user->hasRole(['Superadmin', 'Admin Office'])) {
            $targetOpdId = $user->opd_id;
        }

        if (empty($targetOpdId)) {
            return response()->json([
                'message' => 'Perangkat daerah belum ditentukan.',
            ], 422);
        }

        $periodeId = $request->input('periode_penilaian_id');
        $catatan = $request->input('catatan');

        $submission = $this->service->submitToKepalaOpd(
            (string) $targetOpdId,
            $periodeId ? (string) $periodeId : null,
            $user,
            $catatan ? (string) $catatan : null
        );

        return response()->json([
            'message' => 'Seluruh lembar kerja pengelolaan risiko berhasil diajukan kepada Kepala OPD.',
            'data' => $submission,
        ]);
    }

    /**
     * Review by Kepala OPD (Approve or Reject).
     */
    public function reviewKepalaOpd(ReviewKepalaOpdRequest $request, string $id): JsonResponse
    {
        $validated = $request->validated();
        $submission = $this->service->reviewByKepalaOpd(
            $id,
            $validated['status'],
            $validated['catatan'] ?? null,
            $request->user()
        );

        $actionText = $validated['status'] === 'approved'
            ? 'disetujui dan diteruskan kepada Auditor Pengawas'
            : 'dikembalikan kepada Operator OPD untuk diperbaiki';

        return response()->json([
            'message' => "Pengajuan berhasil {$actionText}.",
            'data' => $submission,
        ]);
    }

    /**
     * Delegate auditor revision down to Operator OPD.
     */
    public function delegateOperator(DelegateOperatorRequest $request, string $id): JsonResponse
    {
        $validated = $request->validated();
        $submission = $this->service->delegateRevisionToOperator(
            $id,
            $validated['catatan'] ?? null,
            $request->user()
        );

        return response()->json([
            'message' => 'Catatan revisi berhasil didelegasikan kepada Operator OPD.',
            'data' => $submission,
        ]);
    }

    /**
     * Get list of OPD risk submissions for an auditor or inspectorate.
     */
    public function indexReviews(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user?->can('review_risiko.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat daftar review risiko OPD.');
        }

        $perPage = (int) $request->input('per_page', 15);
        $filters = $request->only(['search', 'status', 'periode_penilaian_id', 'auditor_id', 'tier']);

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
        if (! $user?->can('review_risiko.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat detail review risiko.');
        }

        $submission = $this->service->getSubmissionDetail($id, $user);

        return response()->json(['data' => $submission]);
    }

    /**
     * Review a specific form item by Auditor (Approve or Reject with revision notes).
     */
    public function reviewItem(ReviewAuditorItemRequest $request, string $id): JsonResponse
    {
        $validated = $request->validated();
        $item = $this->service->reviewByAuditor(
            $id,
            $validated['form_code'],
            $validated['status'],
            $validated['catatan_revisi'] ?? null,
            $request->user()
        );

        $actionText = $validated['status'] === 'approved' ? 'disetujui' : 'ditolak (dikembalikan ke Kepala OPD)';

        return response()->json([
            'message' => "Form {$validated['form_code']} berhasil {$actionText}.",
            'data' => $item,
        ]);
    }

    /**
     * Auditor forwards Pengawas rejection to Kepala OPD.
     */
    public function forwardRevisionAuditor(ForwardRevisionAuditorRequest $request, string $id): JsonResponse
    {
        $validated = $request->validated();
        $submission = $this->service->forwardRevisionFromAuditor(
            $id,
            $validated['catatan'] ?? null,
            $request->user()
        );

        return response()->json([
            'message' => 'Catatan revisi pengawas berhasil diteruskan kepada Kepala OPD.',
            'data' => $submission,
        ]);
    }

    /**
     * Auditor resubmits clarification directly back to Pengawas.
     */
    public function resubmitPengawas(ResubmitPengawasRequest $request, string $id): JsonResponse
    {
        $validated = $request->validated();
        $submission = $this->service->resubmitToPengawas(
            $id,
            $validated['catatan'] ?? null,
            $request->user()
        );

        return response()->json([
            'message' => 'Berkas klarifikasi berhasil dikirimkan kembali kepada Pengawas Inspektorat.',
            'data' => $submission,
        ]);
    }

    /**
     * Pengawas (Inspektorat) reviews a specific form item (Approve final or Reject to Auditor).
     */
    public function reviewPengawas(ReviewPengawasItemRequest $request, string $id): JsonResponse
    {
        $validated = $request->validated();
        $item = $this->service->reviewByPengawas(
            $id,
            $validated['form_code'],
            $validated['status'],
            $validated['catatan_revisi'] ?? null,
            $request->user()
        );

        $actionText = $validated['status'] === 'approved' ? 'disahkan' : 'ditolak (dikembalikan ke Auditor)';

        return response()->json([
            'message' => "Form {$validated['form_code']} berhasil {$actionText}.",
            'data' => $item,
        ]);
    }
}
