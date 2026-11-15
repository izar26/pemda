<?php

declare(strict_types=1);

namespace App\Services\Risiko\Pengajuan;

use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\User;
use App\Services\Risiko\Registry\RiskFormRegistry;

class PengajuanReadinessService
{
    public function __construct(
        protected PengajuanQueryService $queryService,
        protected RiskFormRegistry $registry
    ) {}

    /**
     * Check submission readiness and completeness of all required forms.
     *
     * @return array<string, mixed>
     */
    public function checkReadiness(string $opdId, ?string $periodeId = null, ?User $currentUser = null): array
    {
        $resolvedPeriodeId = $this->queryService->resolvePeriodeId($periodeId);
        $submission = $this->queryService->getOrCreateSubmission($opdId, $resolvedPeriodeId);

        // 1. Check Auditor Assignment
        $assignment = AuditorOpdAssignment::where('opd_id', $opdId)
            ->where('is_active', true)
            ->whereHas('auditor')
            ->with(['auditor:id,name,nip,email,jabatan'])
            ->first();

        $hasAuditor = $assignment !== null;

        // 2. Find Kepala OPD (User with role Executive / permission review_risiko.review_kepala and opd_id matching)
        $kepalaOpdUser = User::where('opd_id', $opdId)
            ->where(function ($q) {
                $q->whereHas('roles', fn ($r) => $r->whereIn('name', ['Executive', 'Kepala OPD']))
                    ->orWhereHas('permissions', fn ($p) => $p->where('name', 'review_risiko.review_kepala'));
            })
            ->select(['id', 'name', 'nip', 'jabatan', 'email'])
            ->first();

        // 3. Evaluate completeness across all registered form handlers (Strategy Pattern)
        $formCompleteness = [];
        $missingForms = [];

        foreach ($this->registry->all() as $code => $handler) {
            $stringCode = (string) $code;
            $isComplete = $handler->isComplete($opdId, $resolvedPeriodeId);
            $formCompleteness[$stringCode] = $isComplete;

            if (! $isComplete && $handler->isRequired($submission)) {
                $missingForms[] = [
                    'code' => strtoupper($stringCode),
                    'name' => $handler->getName(),
                    'description' => $handler->getIncompleteMessage(),
                ];
            }
        }

        $allFormsComplete = empty($missingForms);

        // 4. Form status mapping from submission items
        $formStatuses = [];
        $formDetails = [];
        $rejectionNotes = [];
        foreach ($submission->items as $item) {
            $code = strtolower((string) $item->form_code);
            $formStatuses[$code] = $item->status;
            $formDetails[$code] = [
                'form_code' => $code,
                'status' => $item->status,
                'status_kepala_opd' => $item->status_kepala_opd,
                'catatan_kepala_opd' => $item->catatan_kepala_opd,
                'status_auditor' => $item->status_auditor,
                'catatan_auditor' => $item->catatan_auditor,
                'status_pengawas' => $item->status_pengawas,
                'catatan_pengawas' => $item->catatan_pengawas,
                'catatan_revisi' => $item->catatan_revisi,
                'reviewed_at' => $item->reviewed_at,
                'reviewed_by' => $item->reviewedBy,
            ];
            if ($item->status === PengajuanPenilaianRisikoItem::STATUS_REJECTED) {
                $rejectionNotes[$code] = $item->catatan_revisi;
            }
        }

        // 5. Permissions and state machine capabilities
        $currentTier = $submission->current_tier ?? PengajuanPenilaianRisiko::TIER_OPERATOR;
        $status = $submission->status;

        // Operator submission capability
        $canSubmitToKepala = $hasAuditor && $allFormsComplete && in_array($status, [
            PengajuanPenilaianRisiko::STATUS_DRAFT,
            PengajuanPenilaianRisiko::STATUS_REVISION_BY_KEPALA,
            PengajuanPenilaianRisiko::STATUS_REVISION_TO_OPERATOR,
        ], true);

        // Kepala OPD action capabilities
        $isKepalaOpdOfThisOpd = $currentUser && (
            $currentUser->isRegionalAdmin()
            || (($currentUser->can('review_risiko.review_kepala') || $currentUser->hasRole('Executive')) && (string) $currentUser->opd_id === (string) $opdId)
        );

        $canReviewKepala = $currentTier === PengajuanPenilaianRisiko::TIER_KEPALA_OPD
            && $status === PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA
            && ($currentUser ? $isKepalaOpdOfThisOpd : true);

        $canDelegateOperator = $currentTier === PengajuanPenilaianRisiko::TIER_KEPALA_OPD
            && $status === PengajuanPenilaianRisiko::STATUS_REVISION_BY_AUDITOR
            && ($currentUser ? $isKepalaOpdOfThisOpd : true);

        // Auditor action capabilities
        $isAssignedAuditor = $currentUser && (
            $currentUser->isRegionalAdmin()
            || $currentUser->hasRole('Koordinator Pengawas')
            || $currentUser->can('review_risiko.review_pengawas')
            || (($currentUser->can('review_risiko.approve') || $currentUser->hasRole('Auditor')) && ($currentUser->id === $submission->auditor_id || $currentUser->canReadOpdData($opdId)))
        );

        $canReviewAuditor = $currentTier === PengajuanPenilaianRisiko::TIER_AUDITOR
            && in_array($status, [
                PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
                PengajuanPenilaianRisiko::STATUS_IN_REVIEW_AUDITOR,
                PengajuanPenilaianRisiko::STATUS_SUBMITTED,
                PengajuanPenilaianRisiko::STATUS_IN_REVIEW,
            ], true)
            && ($currentUser ? $isAssignedAuditor : true);

        $canForwardRevisionAuditor = $currentTier === PengajuanPenilaianRisiko::TIER_AUDITOR
            && $status === PengajuanPenilaianRisiko::STATUS_REVISION_BY_PENGAWAS
            && ($currentUser ? $isAssignedAuditor : true);

        $canResubmitPengawas = $currentTier === PengajuanPenilaianRisiko::TIER_AUDITOR
            && $status === PengajuanPenilaianRisiko::STATUS_REVISION_BY_PENGAWAS
            && ($currentUser ? $isAssignedAuditor : true);

        // Pengawas action capabilities
        $isPengawas = $currentUser && (
            $currentUser->isRegionalAdmin()
            || $currentUser->can('review_risiko.review_pengawas')
            || $currentUser->hasRole('Koordinator Pengawas')
        );

        $canReviewPengawas = $currentTier === PengajuanPenilaianRisiko::TIER_PENGAWAS
            && in_array($status, [
                PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS,
                PengajuanPenilaianRisiko::STATUS_IN_REVIEW_PENGAWAS,
            ], true)
            && ($currentUser ? $isPengawas : true);

        $isReadyToSubmit = $canSubmitToKepala;

        return [
            'submission' => $submission,
            'current_tier' => $currentTier,
            'has_auditor' => $hasAuditor,
            'assigned_auditor' => $assignment?->auditor,
            'kepala_opd' => $kepalaOpdUser,
            'is_2b_complete' => $formCompleteness['2b'] ?? false,
            'is_2c_complete' => $formCompleteness['2c'] ?? false,
            'is_3a_complete' => $formCompleteness['3a'] ?? false,
            'is_3b_complete' => $formCompleteness['3b'] ?? false,
            'is_3c_complete' => $formCompleteness['3c'] ?? false,
            'is_rca_complete' => $formCompleteness['rca'] ?? false,
            'is_4_complete' => $formCompleteness['4'] ?? false,
            'is_5_complete' => $formCompleteness['5'] ?? false,
            'is_6_complete' => $formCompleteness['6'] ?? false,
            'is_7_complete' => $formCompleteness['7'] ?? false,
            'is_8_complete' => $formCompleteness['8'] ?? false,
            'is_9_complete' => $formCompleteness['9'] ?? false,
            'is_10_complete' => $formCompleteness['10'] ?? false,
            'is_fra_complete' => $formCompleteness['fra'] ?? false,
            'is_2b_approved' => ($formStatuses['2b'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_2c_approved' => ($formStatuses['2c'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_3a_approved' => ($formStatuses['3a'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_3b_approved' => ($formStatuses['3b'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_3c_approved' => ($formStatuses['3c'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_4_approved' => ($formStatuses['4'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_5_approved' => ($formStatuses['5'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_6_approved' => ($formStatuses['6'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_7_approved' => ($formStatuses['7'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_8_approved' => ($formStatuses['8'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_9_approved' => ($formStatuses['9'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_10_approved' => ($formStatuses['10'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_fra_approved' => ($formStatuses['fra'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_rca_approved' => ($formStatuses['rca'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'form_completeness' => $formCompleteness,
            'form_statuses' => $formStatuses,
            'form_details' => $formDetails,
            'rejection_notes' => $rejectionNotes,
            'all_forms_complete' => $allFormsComplete,
            'missing_forms' => $missingForms,
            'is_ready_to_submit' => $isReadyToSubmit,
            'is_locked' => $submission->isLockedForOperator(),
            'is_locked_for_operator' => $submission->isLockedForOperator(),
            'can_submit_to_kepala' => $canSubmitToKepala,
            'can_review_kepala' => $canReviewKepala,
            'can_delegate_operator' => $canDelegateOperator,
            'can_review_auditor' => $canReviewAuditor,
            'can_forward_revision_auditor' => $canForwardRevisionAuditor,
            'can_resubmit_pengawas' => $canResubmitPengawas,
            'can_review_pengawas' => $canReviewPengawas,
            'status' => $submission->status,
        ];
    }

    /**
     * Check if a given OPD can edit their forms in the specified period.
     * Throws 403 / ValidationException if not allowed.
     */
    public function assertOpdCanEdit(string $opdId, ?string $periodeId = null, ?User $user = null, ?string $formCode = null): void
    {
        // 0. Tenant isolation: OPD user can never edit another OPD's data
        if ($user && $user->isRestrictedToOpd()) {
            if (! $user->opd_id || (string) $user->opd_id !== (string) $opdId) {
                abort(403, 'Anda tidak memiliki hak akses untuk mengelola data risiko perangkat daerah lain.');
            }
        }

        // 1. Check if OPD has an assigned auditor (Strict: No role can bypass if OPD has no auditor)
        $hasAuditor = AuditorOpdAssignment::where('opd_id', $opdId)
            ->where('is_active', true)
            ->whereHas('auditor')
            ->exists();

        if (! $hasAuditor) {
            abort(403, 'Perangkat Daerah (OPD) belum memiliki Auditor Pengawas yang ditugaskan oleh Inspektorat. Pengisian atau pengubahan lembar kerja belum dapat dilakukan.');
        }

        $resolvedPeriodeId = $this->queryService->resolvePeriodeId($periodeId);

        // 2. Check submission status lock
        $submission = PengajuanPenilaianRisiko::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->first();

        if ($submission) {
            if ($submission->isLockedForOperator()) {
                abort(403, 'Lembar kerja risiko sedang dalam proses pemeriksaan berjenjang atau telah disetujui (read-only).');
            }

            // If a specific form is requested, ensure that form item was not already approved
            if ($formCode) {
                $cleanCode = strtolower($formCode);
                $item = $submission->items()->where('form_code', $cleanCode)->first();
                if ($item && $item->status === PengajuanPenilaianRisikoItem::STATUS_APPROVED) {
                    $upperCode = strtoupper($formCode);
                    abort(403, "Lembar kerja Form {$upperCode} telah disetujui dan tidak dapat diubah lagi.");
                }
            }
        }
    }
}
