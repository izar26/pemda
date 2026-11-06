<?php

namespace App\Services\Risiko\Pengajuan;

use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\User;

class PengajuanReadinessService
{
    public function __construct(
        protected PengajuanQueryService $queryService
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

        // 2. Find Kepala OPD (User with role Executive and opd_id matching)
        $kepalaOpdUser = User::where('opd_id', $opdId)
            ->whereHas('roles', fn ($q) => $q->where('name', 'Executive'))
            ->select(['id', 'name', 'nip', 'jabatan', 'email'])
            ->first();

        // 3. Check Form 2B (Konteks Strategis)
        $konteks2b = KonteksPenilaian::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->with(['sasarans', 'indikators'])
            ->first();

        $is2bComplete = (bool) (
            $konteks2b &&
            ! empty($konteks2b->sumber_data_id) &&
            ! empty($konteks2b->tujuan_penilaian_id) &&
            $konteks2b->sasarans->isNotEmpty() &&
            $konteks2b->indikators->isNotEmpty()
        );

        // 4. Check Form 2C (Konteks Operasional)
        $operasional = KonteksOperasional::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->withCount(['items as programs_count' => fn ($q) => $q->where('jenis', 'program')])
            ->first();

        $is2cComplete = (bool) ($operasional && $operasional->programs_count > 0);

        // List missing forms
        $missingForms = [];
        if (! $is2bComplete) {
            $missingForms[] = [
                'code' => '2B',
                'name' => 'Konteks Strategis (Form 2B)',
                'description' => 'Tujuan, sasaran, dan indikator strategis OPD belum terisi lengkap.',
            ];
        }
        if (! $is2cComplete) {
            $missingForms[] = [
                'code' => '2C',
                'name' => 'Konteks Operasional (Form 2C)',
                'description' => 'Pohon kinerja program/kegiatan operasional belum ditambahkan.',
            ];
        }

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

        $allFormsComplete = $is2bComplete && $is2cComplete;

        // Permissions and state machine capabilities
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
            $currentUser->hasRole(['Superadmin', 'Admin Office'])
            || ($currentUser->hasRole('Executive') && (string) $currentUser->opd_id === (string) $opdId)
        );

        $canReviewKepala = $currentTier === PengajuanPenilaianRisiko::TIER_KEPALA_OPD
            && $status === PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA
            && ($currentUser ? $isKepalaOpdOfThisOpd : true);

        $canDelegateOperator = $currentTier === PengajuanPenilaianRisiko::TIER_KEPALA_OPD
            && $status === PengajuanPenilaianRisiko::STATUS_REVISION_BY_AUDITOR
            && ($currentUser ? $isKepalaOpdOfThisOpd : true);

        // Auditor action capabilities
        $isAssignedAuditor = $currentUser && (
            $currentUser->hasRole(['Superadmin', 'Admin Office', 'Inspektorat'])
            || ($currentUser->hasRole('Auditor') && ($currentUser->id === $submission->auditor_id || $currentUser->canReadOpdData($opdId)))
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
        $isPengawas = $currentUser && $currentUser->hasRole(['Inspektorat', 'Superadmin', 'Admin Office']);

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
            'is_2b_complete' => $is2bComplete,
            'is_2c_complete' => $is2cComplete,
            'is_2b_approved' => ($formStatuses['2b'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_2c_approved' => ($formStatuses['2c'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
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
