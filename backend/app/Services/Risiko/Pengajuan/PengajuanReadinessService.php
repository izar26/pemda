<?php

namespace App\Services\Risiko\Pengajuan;

use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Risiko\AnalisisRisiko;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\Risiko\RootCauseAnalysis;
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

        // 5. Check Form 3A (Identifikasi Risiko Strategis Pemda)
        $dokumen3a = IdentifikasiRisikoPemda::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->withCount('items')
            ->first();

        $is3aComplete = (bool) (
            $dokumen3a &&
            ! empty($dokumen3a->master_urusan_pemerintahan_id) &&
            $dokumen3a->items_count > 0
        );

        // 6. Check Form 3B (Identifikasi Risiko Strategis OPD)
        $dokumen3b = IdentifikasiRisikoOpd::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->withCount('items')
            ->first();

        $is3bComplete = (bool) (
            $dokumen3b &&
            ! empty($dokumen3b->master_urusan_pemerintahan_id) &&
            $dokumen3b->items_count > 0
        );

        // 6b. Check Form 3C (Identifikasi Risiko Operasional OPD)
        $dokumen3c = IdentifikasiRisikoOpdOperasional::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->withCount('items')
            ->first();

        $is3cComplete = (bool) (
            $dokumen3c &&
            ! empty($dokumen3c->master_urusan_pemerintahan_id) &&
            $dokumen3c->items_count > 0
        );

        $ids3b = IdentifikasiRisikoOpdItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $resolvedPeriodeId))->pluck('id');
        $ids3c = IdentifikasiRisikoOpdOperasionalItem::whereHas('dokumen', fn ($q) => $q->where('opd_id', $opdId)->where('periode_penilaian_id', $resolvedPeriodeId))->pluck('id');
        $totalForm4 = $ids3b->count() + $ids3c->count();
        $completeForm4 = AnalisisRisiko::where(fn ($q) => $q->whereIn('risiko_opd_item_id', $ids3b)->orWhereIn('risiko_operasional_item_id', $ids3c))
            ->whereNotNull('kriteria_kemungkinan')->whereNotNull('inheren_kemungkinan')->whereNotNull('kriteria_dampak')->whereNotNull('inheren_dampak')
            ->whereNotNull('residual_kriteria_kemungkinan')->where('residual_kriteria_kemungkinan', '!=', '')->whereNotNull('residual_kriteria_dampak')->where('residual_kriteria_dampak', '!=', '')
            ->whereNotNull('residual_kemungkinan')->whereNotNull('residual_dampak')->whereNotNull('pengendalian_ada')
            ->where(fn ($q) => $q->where('pengendalian_ada', false)->orWhere(fn ($q) => $q->where('pengendalian_ada', true)->whereNotNull('pengendalian_uraian')->where('pengendalian_uraian', '!=', '')->whereNotNull('sub_unsur_spip_id')->whereNotNull('pengendalian_memadai')))
            ->count();
        $is4Complete = $totalForm4 > 0 && $completeForm4 === $totalForm4;
        $form4Required = ! $submission->isLockedForOperator() || $submission->items->contains('form_code', '4');

        // 7. Check Form RCA (Root Cause Analysis 5-Whys for 3A, 3B, & 3C)
        $totalRiskItemsCount = ($dokumen3a?->items_count ?? 0) + ($dokumen3b?->items_count ?? 0) + ($dokumen3c?->items_count ?? 0);
        $isRcaComplete = false;
        if ($totalRiskItemsCount > 0) {
            $unresolvedRcaCount = RootCauseAnalysis::where(function ($query) use ($dokumen3a, $dokumen3b, $dokumen3c) {
                $query->where(function ($sub) use ($dokumen3a) {
                    if ($dokumen3a) {
                        $sub->whereHas('itemPemda', fn ($q) => $q->where('identifikasi_risiko_pemda_id', $dokumen3a->id));
                    } else {
                        $sub->whereRaw('1 = 0');
                    }
                })->orWhere(function ($sub) use ($dokumen3b) {
                    if ($dokumen3b) {
                        $sub->whereHas('itemOpd', fn ($q) => $q->where('identifikasi_risiko_opd_id', $dokumen3b->id));
                    } else {
                        $sub->whereRaw('1 = 0');
                    }
                })->orWhere(function ($sub) use ($dokumen3c) {
                    if ($dokumen3c) {
                        $sub->whereHas('itemOperasional', fn ($q) => $q->where('identifikasi_risiko_opd_operasional_id', $dokumen3c->id));
                    } else {
                        $sub->whereRaw('1 = 0');
                    }
                });
            })
                ->where(function ($q) {
                    $q->whereNull('akar_penyebab')
                        ->orWhere('akar_penyebab', '')
                        ->orWhereNull('jenis_penyebab')
                        ->orWhere('jenis_penyebab', '');
                })
                ->count();

            $totalRcaCount = RootCauseAnalysis::where(function ($query) use ($dokumen3a, $dokumen3b, $dokumen3c) {
                $query->where(function ($sub) use ($dokumen3a) {
                    if ($dokumen3a) {
                        $sub->whereHas('itemPemda', fn ($q) => $q->where('identifikasi_risiko_pemda_id', $dokumen3a->id));
                    } else {
                        $sub->whereRaw('1 = 0');
                    }
                })->orWhere(function ($sub) use ($dokumen3b) {
                    if ($dokumen3b) {
                        $sub->whereHas('itemOpd', fn ($q) => $q->where('identifikasi_risiko_opd_id', $dokumen3b->id));
                    } else {
                        $sub->whereRaw('1 = 0');
                    }
                })->orWhere(function ($sub) use ($dokumen3c) {
                    if ($dokumen3c) {
                        $sub->whereHas('itemOperasional', fn ($q) => $q->where('identifikasi_risiko_opd_operasional_id', $dokumen3c->id));
                    } else {
                        $sub->whereRaw('1 = 0');
                    }
                });
            })->count();

            $isRcaComplete = $totalRcaCount === $totalRiskItemsCount && $unresolvedRcaCount === 0;
        }

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
        if (! $is3aComplete) {
            $missingForms[] = [
                'code' => '3A',
                'name' => 'Identifikasi Risiko Pemda (Form 3A)',
                'description' => 'Urusan Pemerintahan belum dipilih atau daftar risiko strategis Pemda belum ditambahkan.',
            ];
        }
        if (! $is3bComplete) {
            $missingForms[] = [
                'code' => '3B',
                'name' => 'Identifikasi Risiko OPD (Form 3B)',
                'description' => 'Urusan Pemerintahan belum dipilih atau daftar risiko strategis OPD belum ditambahkan.',
            ];
        }
        if (! $is3cComplete) {
            $missingForms[] = [
                'code' => '3C',
                'name' => 'Identifikasi Risiko Operasional (Form 3C)',
                'description' => 'Urusan Pemerintahan belum dipilih atau daftar risiko operasional OPD belum ditambahkan.',
            ];
        }
        if ($form4Required && ! $is4Complete) {
            $missingForms[] = ['code' => '4', 'name' => 'Analisis dan Evaluasi Risiko (Form 4)', 'description' => 'Lengkapi analisis seluruh risiko 3B dan 3C.'];
        }
        if (! $isRcaComplete) {
            $missingForms[] = [
                'code' => 'RCA',
                'name' => 'Root Cause Analysis (Form RCA)',
                'description' => 'Analisis 5-Whys dan jenis penyebab pada Form RCA belum dilengkapi untuk seluruh risiko (3A, 3B, & 3C).',
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

        $allFormsComplete = $is2bComplete && $is2cComplete && $is3aComplete && $is3bComplete && $is3cComplete && $isRcaComplete && (! $form4Required || $is4Complete);

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
            'is_3a_complete' => $is3aComplete,
            'is_3b_complete' => $is3bComplete,
            'is_3c_complete' => $is3cComplete,
            'is_rca_complete' => $isRcaComplete,
            'is_4_complete' => $is4Complete,
            'is_2b_approved' => ($formStatuses['2b'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_2c_approved' => ($formStatuses['2c'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_3a_approved' => ($formStatuses['3a'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_3b_approved' => ($formStatuses['3b'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_3c_approved' => ($formStatuses['3c'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_4_approved' => ($formStatuses['4'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
            'is_rca_approved' => ($formStatuses['rca'] ?? null) === PengajuanPenilaianRisikoItem::STATUS_APPROVED,
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
