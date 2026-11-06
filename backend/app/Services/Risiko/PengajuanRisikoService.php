<?php

namespace App\Services\Risiko;

use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\User;
use App\Services\Risiko\Pengajuan\PengajuanQueryService;
use App\Services\Risiko\Pengajuan\PengajuanReadinessService;
use App\Services\Risiko\Pengajuan\PengajuanWorkflowService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PengajuanRisikoService
{
    public const REQUIRED_FORM_CODES = ['2b', '2c'];

    public function __construct(
        protected PengajuanQueryService $queryService,
        protected PengajuanReadinessService $readinessService,
        protected PengajuanWorkflowService $workflowService
    ) {}

    /**
     * Resolve active evaluation period ID if null.
     */
    public function resolvePeriodeId(?string $periodeId = null): string
    {
        return $this->queryService->resolvePeriodeId($periodeId);
    }

    /**
     * Get or create a submission record for an OPD and Periode.
     */
    public function getOrCreateSubmission(string $opdId, ?string $periodeId = null): PengajuanPenilaianRisiko
    {
        return $this->queryService->getOrCreateSubmission($opdId, $periodeId);
    }

    /**
     * Check submission readiness and completeness of all required forms.
     *
     * @return array<string, mixed>
     */
    public function checkReadiness(string $opdId, ?string $periodeId = null, ?User $currentUser = null): array
    {
        return $this->readinessService->checkReadiness($opdId, $periodeId, $currentUser);
    }

    /**
     * Submit risk management forms by OPD Operator to Kepala OPD.
     */
    public function submitToKepalaOpd(string $opdId, ?string $periodeId, User $user, ?string $catatan = null): PengajuanPenilaianRisiko
    {
        return $this->workflowService->submitToKepalaOpd($opdId, $periodeId, $user, $catatan);
    }

    /**
     * Submit alias for backward compatibility.
     */
    public function submitForReview(string $opdId, ?string $periodeId, User $user, ?string $catatan = null): PengajuanPenilaianRisiko
    {
        return $this->workflowService->submitForReview($opdId, $periodeId, $user, $catatan);
    }

    /**
     * Review by Kepala OPD (Approve or Reject internal submission).
     */
    public function reviewByKepalaOpd(
        string $submissionId,
        string $status,
        ?string $catatan,
        User $kepalaOpdUser
    ): PengajuanPenilaianRisiko {
        return $this->workflowService->reviewByKepalaOpd($submissionId, $status, $catatan, $kepalaOpdUser);
    }

    /**
     * Delegate revision returned from Auditor down to Operator OPD.
     */
    public function delegateRevisionToOperator(
        string $submissionId,
        ?string $catatan,
        User $kepalaOpdUser
    ): PengajuanPenilaianRisiko {
        return $this->workflowService->delegateRevisionToOperator($submissionId, $catatan, $kepalaOpdUser);
    }

    /**
     * Auditor reviews a specific form item (2B or 2C).
     */
    public function reviewByAuditor(
        string $submissionId,
        string $formCode,
        string $status,
        ?string $catatanRevisi,
        User $auditorUser
    ): PengajuanPenilaianRisikoItem {
        return $this->workflowService->reviewByAuditor($submissionId, $formCode, $status, $catatanRevisi, $auditorUser);
    }

    /**
     * Backward-compatible alias for reviewItem.
     */
    public function reviewItem(
        string $submissionId,
        string $formCode,
        string $status,
        ?string $catatanRevisi,
        User $auditorUser
    ): PengajuanPenilaianRisikoItem {
        return $this->workflowService->reviewItem($submissionId, $formCode, $status, $catatanRevisi, $auditorUser);
    }

    /**
     * Auditor forwards Pengawas rejection down to Kepala OPD.
     */
    public function forwardRevisionFromAuditor(
        string $submissionId,
        ?string $catatan,
        User $auditorUser
    ): PengajuanPenilaianRisiko {
        return $this->workflowService->forwardRevisionFromAuditor($submissionId, $catatan, $auditorUser);
    }

    /**
     * Auditor re-submits directly back to Pengawas with clarification.
     */
    public function resubmitToPengawas(
        string $submissionId,
        ?string $catatan,
        User $auditorUser
    ): PengajuanPenilaianRisiko {
        return $this->workflowService->resubmitToPengawas($submissionId, $catatan, $auditorUser);
    }

    /**
     * Pengawas (Inspektorat) reviews a specific form item (Approve final or Reject to Auditor).
     */
    public function reviewByPengawas(
        string $submissionId,
        string $formCode,
        string $status,
        ?string $catatanRevisi,
        User $pengawasUser
    ): PengajuanPenilaianRisikoItem {
        return $this->workflowService->reviewByPengawas($submissionId, $formCode, $status, $catatanRevisi, $pengawasUser);
    }

    /**
     * Get list of OPD risk submissions for an auditor or inspectorate.
     *
     * @param  array<string, mixed>  $filters
     */
    public function getAuditorReviewList(User $user, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        return $this->queryService->getAuditorReviewList($user, $filters, $perPage);
    }

    /**
     * Get review detail of an OPD submission.
     */
    public function getSubmissionDetail(string $submissionId, User $user): PengajuanPenilaianRisiko
    {
        return $this->queryService->getSubmissionDetail($submissionId, $user);
    }

    /**
     * Check if a given OPD can edit their forms in the specified period.
     * Throws 403 / ValidationException if not allowed.
     */
    public function assertOpdCanEdit(string $opdId, ?string $periodeId = null, ?User $user = null, ?string $formCode = null): void
    {
        $this->readinessService->assertOpdCanEdit($opdId, $periodeId, $user, $formCode);
    }

    /**
     * Get real-time pending approval counts and actionable items for current user.
     *
     * @return array<string, mixed>
     */
    public function getPendingCounts(User $user, ?string $periodeId = null): array
    {
        return $this->queryService->getPendingCounts($user, $periodeId);
    }
}
