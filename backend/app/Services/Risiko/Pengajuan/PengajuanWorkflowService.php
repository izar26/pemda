<?php

namespace App\Services\Risiko\Pengajuan;

use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoHistory;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PengajuanWorkflowService
{
    public const REQUIRED_FORM_CODES = ['2b', '2c'];

    public function __construct(
        protected PengajuanQueryService $queryService,
        protected PengajuanReadinessService $readinessService,
        protected AuditLogService $auditLogService
    ) {}

    /**
     * Submit risk management forms by OPD Operator to Kepala OPD.
     */
    public function submitToKepalaOpd(string $opdId, ?string $periodeId, User $user, ?string $catatan = null): PengajuanPenilaianRisiko
    {
        $resolvedPeriodeId = $this->queryService->resolvePeriodeId($periodeId);
        $readiness = $this->readinessService->checkReadiness($opdId, $resolvedPeriodeId, $user);

        if (! $readiness['has_auditor']) {
            throw ValidationException::withMessages([
                'auditor' => ['OPD Anda belum memiliki Auditor Pengawas yang ditugaskan oleh Inspektorat. Pengajuan tidak dapat dilakukan.'],
            ]);
        }

        if (! $readiness['all_forms_complete']) {
            $missingNames = array_column($readiness['missing_forms'], 'name');
            throw ValidationException::withMessages([
                'forms' => ['Seluruh lembar kerja ('.implode(', ', $missingNames).') wajib dilengkapi terlebih dahulu sebelum diajukan.'],
            ]);
        }

        /** @var PengajuanPenilaianRisiko $submission */
        $submission = $readiness['submission'];

        if ($submission->isLockedForOperator()) {
            throw ValidationException::withMessages([
                'status' => ['Lembar kerja risiko Anda sedang dalam proses verifikasi berjenjang atau telah disetujui (read-only).'],
            ]);
        }

        return DB::transaction(function () use ($submission, $readiness, $user, $catatan) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);
            if (! $lockedSubmission || $lockedSubmission->isLockedForOperator()) {
                throw ValidationException::withMessages([
                    'status' => ['Lembar kerja risiko Anda sedang dalam proses verifikasi berjenjang atau telah disetujui (read-only).'],
                ]);
            }

            $lockedSubmission->update([
                'auditor_id' => $readiness['assigned_auditor']?->id ?? $lockedSubmission->auditor_id,
                'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA,
                'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
                'submitted_at' => now(),
                'submitted_by' => $user->id,
            ]);

            // Set all draft or rejected items to submitted status
            foreach (self::REQUIRED_FORM_CODES as $code) {
                $item = PengajuanPenilaianRisikoItem::firstOrCreate(
                    [
                        'pengajuan_id' => $lockedSubmission->id,
                        'form_code' => $code,
                    ],
                    [
                        'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                        'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    ]
                );

                if ($item->status !== PengajuanPenilaianRisikoItem::STATUS_APPROVED) {
                    $item->update([
                        'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                        'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    ]);
                }
            }

            // Timeline history
            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $lockedSubmission->id,
                'action' => 'submitted_to_kepala_opd',
                'catatan' => $catatan ?: 'Lembar kerja risiko lengkap diajukan oleh Operator OPD kepada Kepala OPD.',
                'user_id' => $user->id,
                'created_at' => now(),
            ]);

            $this->auditLogService->log(
                action: 'SUBMIT_TO_KEPALA_OPD',
                module: 'Pengelolaan Risiko',
                description: "Operator {$user->name} mengajukan lembar kerja risiko OPD {$lockedSubmission->opd?->nama} ke Kepala OPD",
                user: $user,
                context: [
                    'pengajuan_id' => $lockedSubmission->id,
                    'opd_id' => $lockedSubmission->opd_id,
                    'periode_penilaian_id' => $lockedSubmission->periode_penilaian_id,
                    'catatan' => $catatan,
                ],
                auditableType: PengajuanPenilaianRisiko::class,
                auditableId: $lockedSubmission->id,
            );

            return $lockedSubmission->fresh([
                'opd',
                'periodePenilaian',
                'auditor',
                'kepalaOpd',
                'pengawas',
                'items.reviewedBy',
                'histories.user',
            ]);
        });
    }

    /**
     * Submit alias for backward compatibility.
     */
    public function submitForReview(string $opdId, ?string $periodeId, User $user, ?string $catatan = null): PengajuanPenilaianRisiko
    {
        return $this->submitToKepalaOpd($opdId, $periodeId, $user, $catatan);
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
        if (! in_array($status, ['approved', 'rejected'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Status persetujuan harus disetujui (approved) atau ditolak (rejected).'],
            ]);
        }

        if ($status === 'rejected') {
            $trimmed = trim((string) $catatan);
            if (strlen($trimmed) < 5) {
                throw ValidationException::withMessages([
                    'catatan' => ['Catatan revisi wajib diisi minimal 5 karakter apabila pengajuan ditolak.'],
                ]);
            }
        }

        $submission = PengajuanPenilaianRisiko::with('items')->findOrFail($submissionId);

        // Authorization check: User must be Superadmin / Admin Office OR Executive of that OPD
        $isAuthorized = $kepalaOpdUser->hasRole(['Superadmin', 'Admin Office'])
            || ($kepalaOpdUser->hasRole('Executive') && (string) $kepalaOpdUser->opd_id === (string) $submission->opd_id);

        if (! $isAuthorized) {
            abort(403, 'Hanya Kepala OPD bersangkutan atau Administrator yang berhak melakukan persetujuan tingkat internal OPD.');
        }

        if ($submission->current_tier !== PengajuanPenilaianRisiko::TIER_KEPALA_OPD
            || $submission->status !== PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA) {
            throw ValidationException::withMessages([
                'status' => ['Pengajuan saat ini tidak berada dalam tahap peninjauan Kepala OPD.'],
            ]);
        }

        return DB::transaction(function () use ($submission, $status, $catatan, $kepalaOpdUser) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);

            if ($status === 'rejected') {
                $lockedSubmission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_REVISION_BY_KEPALA,
                    'current_tier' => PengajuanPenilaianRisiko::TIER_OPERATOR,
                ]);

                foreach ($lockedSubmission->items as $item) {
                    if ($item->status !== PengajuanPenilaianRisikoItem::STATUS_APPROVED) {
                        $item->update([
                            'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
                            'catatan_kepala_opd' => $catatan,
                            'status' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
                            'catatan_revisi' => $catatan,
                        ]);
                    }
                }

                PengajuanPenilaianRisikoHistory::create([
                    'pengajuan_id' => $lockedSubmission->id,
                    'action' => 'rejected_by_kepala_opd',
                    'catatan' => "Kepala OPD meminta revisi internal: {$catatan}",
                    'user_id' => $kepalaOpdUser->id,
                    'created_at' => now(),
                ]);

                $this->auditLogService->log(
                    action: 'KEPALA_OPD_REJECTED',
                    module: 'Pengelolaan Risiko',
                    description: "Kepala OPD {$kepalaOpdUser->name} meminta revisi internal lembar kerja OPD {$lockedSubmission->opd?->nama}: {$catatan}",
                    user: $kepalaOpdUser,
                    context: [
                        'pengajuan_id' => $lockedSubmission->id,
                        'opd_id' => $lockedSubmission->opd_id,
                        'catatan' => $catatan,
                    ],
                    auditableType: PengajuanPenilaianRisiko::class,
                    auditableId: $lockedSubmission->id,
                );
            } else {
                $lockedSubmission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
                    'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
                    'kepala_opd_id' => $kepalaOpdUser->id,
                    'kepala_opd_approved_at' => now(),
                ]);

                foreach ($lockedSubmission->items as $item) {
                    $item->update([
                        'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_APPROVED,
                        'status_auditor' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                        'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    ]);
                }

                PengajuanPenilaianRisikoHistory::create([
                    'pengajuan_id' => $lockedSubmission->id,
                    'action' => 'approved_by_kepala_opd',
                    'catatan' => $catatan ?: 'Kepala OPD menyetujui lembar kerja risiko internal dan meneruskannya ke Auditor Pengawas.',
                    'user_id' => $kepalaOpdUser->id,
                    'created_at' => now(),
                ]);

                $this->auditLogService->log(
                    action: 'KEPALA_OPD_APPROVED',
                    module: 'Pengelolaan Risiko',
                    description: "Kepala OPD {$kepalaOpdUser->name} menyetujui lembar kerja OPD {$lockedSubmission->opd?->nama} dan meneruskannya ke Auditor Pengawas",
                    user: $kepalaOpdUser,
                    context: [
                        'pengajuan_id' => $lockedSubmission->id,
                        'opd_id' => $lockedSubmission->opd_id,
                        'catatan' => $catatan,
                    ],
                    auditableType: PengajuanPenilaianRisiko::class,
                    auditableId: $lockedSubmission->id,
                );
            }

            return $lockedSubmission->fresh([
                'opd',
                'periodePenilaian',
                'auditor',
                'kepalaOpd',
                'pengawas',
                'items.reviewedBy',
                'histories.user',
            ]);
        });
    }

    /**
     * Delegate revision returned from Auditor down to Operator OPD.
     */
    public function delegateRevisionToOperator(
        string $submissionId,
        ?string $catatan,
        User $kepalaOpdUser
    ): PengajuanPenilaianRisiko {
        $submission = PengajuanPenilaianRisiko::with('items')->findOrFail($submissionId);

        $isAuthorized = $kepalaOpdUser->hasRole(['Superadmin', 'Admin Office'])
            || ($kepalaOpdUser->hasRole('Executive') && (string) $kepalaOpdUser->opd_id === (string) $submission->opd_id);

        if (! $isAuthorized) {
            abort(403, 'Hanya Kepala OPD bersangkutan atau Administrator yang berhak mendelegasikan revisi ke Operator.');
        }

        if ($submission->status !== PengajuanPenilaianRisiko::STATUS_REVISION_BY_AUDITOR) {
            throw ValidationException::withMessages([
                'status' => ['Pengajuan tidak dalam status menunggu delegasi revisi dari Auditor.'],
            ]);
        }

        return DB::transaction(function () use ($submission, $catatan, $kepalaOpdUser) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);

            $lockedSubmission->update([
                'status' => PengajuanPenilaianRisiko::STATUS_REVISION_TO_OPERATOR,
                'current_tier' => PengajuanPenilaianRisiko::TIER_OPERATOR,
            ]);

            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $lockedSubmission->id,
                'action' => 'delegated_to_operator',
                'catatan' => $catatan ?: 'Kepala OPD meneruskan instruksi revisi dari Auditor kepada Operator OPD untuk diperbaiki.',
                'user_id' => $kepalaOpdUser->id,
                'created_at' => now(),
            ]);

            $this->auditLogService->log(
                action: 'KEPALA_OPD_DELEGATED_TO_OPERATOR',
                module: 'Pengelolaan Risiko',
                description: "Kepala OPD {$kepalaOpdUser->name} mendelegasikan instruksi revisi Auditor OPD {$lockedSubmission->opd?->nama} kepada Operator",
                user: $kepalaOpdUser,
                context: [
                    'pengajuan_id' => $lockedSubmission->id,
                    'opd_id' => $lockedSubmission->opd_id,
                    'catatan' => $catatan,
                ],
                auditableType: PengajuanPenilaianRisiko::class,
                auditableId: $lockedSubmission->id,
            );

            return $lockedSubmission->fresh([
                'opd',
                'periodePenilaian',
                'auditor',
                'kepalaOpd',
                'pengawas',
                'items.reviewedBy',
                'histories.user',
            ]);
        });
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
        $cleanFormCode = strtolower(trim($formCode));
        if (! in_array($cleanFormCode, self::REQUIRED_FORM_CODES, true)) {
            throw ValidationException::withMessages([
                'form_code' => ['Kode formulir tidak valid.'],
            ]);
        }

        if (! in_array($status, [PengajuanPenilaianRisikoItem::STATUS_APPROVED, PengajuanPenilaianRisikoItem::STATUS_REJECTED], true)) {
            throw ValidationException::withMessages([
                'status' => ['Status review harus disetujui (approved) atau ditolak (rejected).'],
            ]);
        }

        if ($status === PengajuanPenilaianRisikoItem::STATUS_REJECTED) {
            $trimmed = trim((string) $catatanRevisi);
            if (strlen($trimmed) < 5) {
                throw ValidationException::withMessages([
                    'catatan_revisi' => ['Catatan revisi wajib diisi minimal 5 karakter jika formulir ditolak.'],
                ]);
            }
        }

        $submission = PengajuanPenilaianRisiko::with('items')->findOrFail($submissionId);

        // Authorization check: Auditor must be assigned to OPD or Superadmin / Inspektorat
        $isSpecialAdmin = $auditorUser->hasRole(['Superadmin', 'Admin Office', 'Inspektorat']);
        if (! $isSpecialAdmin && $auditorUser->hasRole('Auditor')) {
            $hasAssignment = AuditorOpdAssignment::where('auditor_id', $auditorUser->id)
                ->where('opd_id', $submission->opd_id)
                ->where('is_active', true)
                ->exists() || ($submission->auditor_id === $auditorUser->id);

            if (! $hasAssignment) {
                abort(403, 'Anda tidak memiliki hak akses untuk memeriksa perangkat daerah ini.');
            }
        }

        if ($submission->isDraft() || $submission->current_tier === PengajuanPenilaianRisiko::TIER_OPERATOR) {
            throw ValidationException::withMessages([
                'submission' => ['Lembar kerja risiko belum diajukan oleh Kepala OPD kepada Auditor Pengawas.'],
            ]);
        }

        return DB::transaction(function () use ($submission, $cleanFormCode, $status, $catatanRevisi, $auditorUser) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);

            $item = PengajuanPenilaianRisikoItem::firstOrCreate(
                [
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_code' => $cleanFormCode,
                ],
                [
                    'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                ]
            );

            $item->update([
                'status_auditor' => $status,
                'catatan_auditor' => $status === PengajuanPenilaianRisikoItem::STATUS_REJECTED ? $catatanRevisi : null,
                'status' => $status,
                'catatan_revisi' => $status === PengajuanPenilaianRisikoItem::STATUS_REJECTED ? $catatanRevisi : null,
                'reviewed_at' => now(),
                'reviewed_by' => $auditorUser->id,
            ]);

            // Add history entry for item
            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $lockedSubmission->id,
                'form_code' => $cleanFormCode,
                'action' => $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED ? 'auditor_approved_item' : 'auditor_rejected_item',
                'catatan' => $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED
                    ? "Form {$cleanFormCode} disetujui oleh Auditor Pengawas."
                    : "Form {$cleanFormCode} ditolak oleh Auditor Pengawas: {$catatanRevisi}",
                'user_id' => $auditorUser->id,
                'created_at' => now(),
            ]);

            $this->auditLogService->log(
                action: $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED ? 'AUDITOR_APPROVE_ITEM' : 'AUDITOR_REJECT_ITEM',
                module: 'Pengawasan Risiko',
                description: "Auditor {$auditorUser->name} ".($status === PengajuanPenilaianRisikoItem::STATUS_APPROVED ? 'menyetujui' : 'menolak')." Form {$cleanFormCode} OPD {$lockedSubmission->opd?->nama}",
                user: $auditorUser,
                context: [
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_code' => $cleanFormCode,
                    'status' => $status,
                    'catatan' => $catatanRevisi,
                ],
                auditableType: PengajuanPenilaianRisikoItem::class,
                auditableId: $item->id,
            );

            // Re-evaluate parent submission status across all items
            $allItems = PengajuanPenilaianRisikoItem::where('pengajuan_id', $lockedSubmission->id)->get();
            $hasAnyRejected = $allItems->contains('status_auditor', PengajuanPenilaianRisikoItem::STATUS_REJECTED);

            $approvedCount = $allItems->whereIn('form_code', self::REQUIRED_FORM_CODES)
                ->where('status_auditor', PengajuanPenilaianRisikoItem::STATUS_APPROVED)
                ->count();

            $allRequiredApproved = $approvedCount === count(self::REQUIRED_FORM_CODES);

            if ($hasAnyRejected) {
                $lockedSubmission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_REVISION_BY_AUDITOR,
                    'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
                ]);

                PengajuanPenilaianRisikoHistory::create([
                    'pengajuan_id' => $lockedSubmission->id,
                    'action' => 'rejected_by_auditor',
                    'catatan' => 'Auditor mengembalikan berkas kepada Kepala OPD untuk dilakukan perbaikan.',
                    'user_id' => $auditorUser->id,
                    'created_at' => now(),
                ]);

                $this->auditLogService->log(
                    action: 'AUDITOR_REJECTED_SUBMISSION',
                    module: 'Pengawasan Risiko',
                    description: "Auditor {$auditorUser->name} mengembalikan berkas OPD {$lockedSubmission->opd?->nama} ke Kepala OPD untuk perbaikan",
                    user: $auditorUser,
                    context: [
                        'pengajuan_id' => $lockedSubmission->id,
                        'form_code' => $cleanFormCode,
                    ],
                    auditableType: PengajuanPenilaianRisiko::class,
                    auditableId: $lockedSubmission->id,
                );
            } elseif ($allRequiredApproved) {
                $lockedSubmission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS,
                    'current_tier' => PengajuanPenilaianRisiko::TIER_PENGAWAS,
                    'auditor_reviewed_at' => now(),
                ]);

                // Set items to submitted for pengawas
                foreach ($allItems as $itm) {
                    $itm->update([
                        'status_pengawas' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    ]);
                }

                PengajuanPenilaianRisikoHistory::create([
                    'pengajuan_id' => $lockedSubmission->id,
                    'action' => 'forwarded_to_pengawas',
                    'catatan' => 'Seluruh formulir disetujui Auditor Pengawas dan diteruskan kepada Pengawas (Inspektorat) untuk pengesahan final.',
                    'user_id' => $auditorUser->id,
                    'created_at' => now(),
                ]);

                $this->auditLogService->log(
                    action: 'AUDITOR_FORWARDED_TO_PENGAWAS',
                    module: 'Pengawasan Risiko',
                    description: "Auditor {$auditorUser->name} menyetujui seluruh lembar kerja OPD {$lockedSubmission->opd?->nama} dan meneruskannya ke Pengawas APIP",
                    user: $auditorUser,
                    context: [
                        'pengajuan_id' => $lockedSubmission->id,
                    ],
                    auditableType: PengajuanPenilaianRisiko::class,
                    auditableId: $lockedSubmission->id,
                );
            } else {
                $lockedSubmission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_IN_REVIEW_AUDITOR,
                ]);
            }

            return $item->fresh(['reviewedBy:id,name']);
        });
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
        return $this->reviewByAuditor($submissionId, $formCode, $status, $catatanRevisi, $auditorUser);
    }

    /**
     * Auditor forwards Pengawas rejection down to Kepala OPD.
     */
    public function forwardRevisionFromAuditor(
        string $submissionId,
        ?string $catatan,
        User $auditorUser
    ): PengajuanPenilaianRisiko {
        $submission = PengajuanPenilaianRisiko::findOrFail($submissionId);

        $isSpecialAdmin = $auditorUser->hasRole(['Superadmin', 'Admin Office', 'Inspektorat']);
        if (! $isSpecialAdmin && $auditorUser->hasRole('Auditor')) {
            $hasAssignment = AuditorOpdAssignment::where('auditor_id', $auditorUser->id)
                ->where('opd_id', $submission->opd_id)
                ->where('is_active', true)
                ->exists() || ($submission->auditor_id === $auditorUser->id);

            if (! $hasAssignment) {
                abort(403, 'Anda tidak memiliki hak akses untuk perangkat daerah ini.');
            }
        }

        if ($submission->status !== PengajuanPenilaianRisiko::STATUS_REVISION_BY_PENGAWAS) {
            throw ValidationException::withMessages([
                'status' => ['Pengajuan tidak dalam status revisi dari Pengawas.'],
            ]);
        }

        return DB::transaction(function () use ($submission, $catatan, $auditorUser) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);

            $lockedSubmission->update([
                'status' => PengajuanPenilaianRisiko::STATUS_REVISION_BY_AUDITOR,
                'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
            ]);

            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $lockedSubmission->id,
                'action' => 'auditor_forwarded_revision',
                'catatan' => $catatan ?: 'Auditor meneruskan catatan penolakan pengawas kepada Kepala OPD.',
                'user_id' => $auditorUser->id,
                'created_at' => now(),
            ]);

            $this->auditLogService->log(
                action: 'AUDITOR_FORWARD_REVISION_TO_KEPALA',
                module: 'Pengawasan Risiko',
                description: "Auditor {$auditorUser->name} meneruskan catatan penolakan pengawas OPD {$lockedSubmission->opd?->nama} kepada Kepala OPD",
                user: $auditorUser,
                context: [
                    'pengajuan_id' => $lockedSubmission->id,
                    'catatan' => $catatan,
                ],
                auditableType: PengajuanPenilaianRisiko::class,
                auditableId: $lockedSubmission->id,
            );

            return $lockedSubmission->fresh([
                'opd',
                'periodePenilaian',
                'auditor',
                'kepalaOpd',
                'pengawas',
                'items.reviewedBy',
                'histories.user',
            ]);
        });
    }

    /**
     * Auditor re-submits directly back to Pengawas with clarification.
     */
    public function resubmitToPengawas(
        string $submissionId,
        ?string $catatan,
        User $auditorUser
    ): PengajuanPenilaianRisiko {
        $submission = PengajuanPenilaianRisiko::findOrFail($submissionId);

        $isSpecialAdmin = $auditorUser->hasRole(['Superadmin', 'Admin Office', 'Inspektorat']);
        if (! $isSpecialAdmin && $auditorUser->hasRole('Auditor')) {
            $hasAssignment = AuditorOpdAssignment::where('auditor_id', $auditorUser->id)
                ->where('opd_id', $submission->opd_id)
                ->where('is_active', true)
                ->exists() || ($submission->auditor_id === $auditorUser->id);

            if (! $hasAssignment) {
                abort(403, 'Anda tidak memiliki hak akses untuk perangkat daerah ini.');
            }
        }

        if ($submission->status !== PengajuanPenilaianRisiko::STATUS_REVISION_BY_PENGAWAS) {
            throw ValidationException::withMessages([
                'status' => ['Pengajuan tidak dalam status revisi dari Pengawas.'],
            ]);
        }

        return DB::transaction(function () use ($submission, $catatan, $auditorUser) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);

            $lockedSubmission->update([
                'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS,
                'current_tier' => PengajuanPenilaianRisiko::TIER_PENGAWAS,
            ]);

            // Reset rejected pengawas items back to submitted so Pengawas can re-review them
            PengajuanPenilaianRisikoItem::where('pengajuan_id', $lockedSubmission->id)
                ->where('status_pengawas', PengajuanPenilaianRisikoItem::STATUS_REJECTED)
                ->update([
                    'status_pengawas' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                ]);

            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $lockedSubmission->id,
                'action' => 'resubmitted_to_pengawas',
                'catatan' => $catatan ?: 'Auditor telah melengkapi klarifikasi dan mengirimkan kembali berkas kepada Pengawas.',
                'user_id' => $auditorUser->id,
                'created_at' => now(),
            ]);

            $this->auditLogService->log(
                action: 'AUDITOR_RESUBMIT_TO_PENGAWAS',
                module: 'Pengawasan Risiko',
                description: "Auditor {$auditorUser->name} mengirimkan kembali berkas OPD {$lockedSubmission->opd?->nama} kepada Pengawas APIP setelah klarifikasi",
                user: $auditorUser,
                context: [
                    'pengajuan_id' => $lockedSubmission->id,
                    'catatan' => $catatan,
                ],
                auditableType: PengajuanPenilaianRisiko::class,
                auditableId: $lockedSubmission->id,
            );

            return $lockedSubmission->fresh([
                'opd',
                'periodePenilaian',
                'auditor',
                'kepalaOpd',
                'pengawas',
                'items.reviewedBy',
                'histories.user',
            ]);
        });
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
        $cleanFormCode = strtolower(trim($formCode));
        if (! in_array($cleanFormCode, self::REQUIRED_FORM_CODES, true)) {
            throw ValidationException::withMessages([
                'form_code' => ['Kode formulir tidak valid.'],
            ]);
        }

        if (! in_array($status, [PengajuanPenilaianRisikoItem::STATUS_APPROVED, PengajuanPenilaianRisikoItem::STATUS_REJECTED], true)) {
            throw ValidationException::withMessages([
                'status' => ['Status review harus disetujui (approved) atau ditolak (rejected).'],
            ]);
        }

        if ($status === PengajuanPenilaianRisikoItem::STATUS_REJECTED) {
            $trimmed = trim((string) $catatanRevisi);
            if (strlen($trimmed) < 5) {
                throw ValidationException::withMessages([
                    'catatan_revisi' => ['Catatan revisi pengawas wajib diisi minimal 5 karakter jika formulir ditolak.'],
                ]);
            }
        }

        $isAuthorized = $pengawasUser->hasRole(['Inspektorat', 'Superadmin', 'Admin Office']);
        if (! $isAuthorized) {
            abort(403, 'Hanya Pengawas APIP (Inspektorat) atau Administrator yang berhak mengesahkan tingkat akhir.');
        }

        $submission = PengajuanPenilaianRisiko::with('items')->findOrFail($submissionId);

        if ($submission->current_tier !== PengajuanPenilaianRisiko::TIER_PENGAWAS) {
            throw ValidationException::withMessages([
                'submission' => ['Pengajuan saat ini tidak berada pada tahap pengesahan Pengawas/Inspektorat.'],
            ]);
        }

        return DB::transaction(function () use ($submission, $cleanFormCode, $status, $catatanRevisi, $pengawasUser) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);

            $item = PengajuanPenilaianRisikoItem::firstOrCreate(
                [
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_code' => $cleanFormCode,
                ],
                [
                    'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                ]
            );

            $item->update([
                'status_pengawas' => $status,
                'catatan_pengawas' => $status === PengajuanPenilaianRisikoItem::STATUS_REJECTED ? $catatanRevisi : null,
                'status' => $status,
                'catatan_revisi' => $status === PengajuanPenilaianRisikoItem::STATUS_REJECTED ? $catatanRevisi : null,
                'reviewed_at' => now(),
                'reviewed_by' => $pengawasUser->id,
            ]);

            // Add history entry for item
            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $lockedSubmission->id,
                'form_code' => $cleanFormCode,
                'action' => $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED ? 'pengawas_approved_item' : 'pengawas_rejected_item',
                'catatan' => $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED
                    ? "Form {$cleanFormCode} disahkan oleh Pengawas Inspektorat."
                    : "Form {$cleanFormCode} ditolak oleh Pengawas Inspektorat: {$catatanRevisi}",
                'user_id' => $pengawasUser->id,
                'created_at' => now(),
            ]);

            $this->auditLogService->log(
                action: $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED ? 'PENGAWAS_APPROVE_ITEM' : 'PENGAWAS_REJECT_ITEM',
                module: 'Pengawasan Risiko',
                description: "Pengawas {$pengawasUser->name} ".($status === PengajuanPenilaianRisikoItem::STATUS_APPROVED ? 'mengesahkan' : 'menolak')." Form {$cleanFormCode} OPD {$lockedSubmission->opd?->nama}",
                user: $pengawasUser,
                context: [
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_code' => $cleanFormCode,
                    'status' => $status,
                    'catatan' => $catatanRevisi,
                ],
                auditableType: PengajuanPenilaianRisikoItem::class,
                auditableId: $item->id,
            );

            // Re-evaluate parent submission status
            $allItems = PengajuanPenilaianRisikoItem::where('pengajuan_id', $lockedSubmission->id)->get();
            $hasAnyRejected = $allItems->contains('status_pengawas', PengajuanPenilaianRisikoItem::STATUS_REJECTED);

            $approvedCount = $allItems->whereIn('form_code', self::REQUIRED_FORM_CODES)
                ->where('status_pengawas', PengajuanPenilaianRisikoItem::STATUS_APPROVED)
                ->count();

            $allRequiredApproved = $approvedCount === count(self::REQUIRED_FORM_CODES);

            if ($hasAnyRejected) {
                $lockedSubmission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_REVISION_BY_PENGAWAS,
                    'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
                ]);

                PengajuanPenilaianRisikoHistory::create([
                    'pengajuan_id' => $lockedSubmission->id,
                    'action' => 'rejected_by_pengawas',
                    'catatan' => 'Pengawas mengembalikan berkas kepada Auditor untuk ditindaklanjuti.',
                    'user_id' => $pengawasUser->id,
                    'created_at' => now(),
                ]);

                $this->auditLogService->log(
                    action: 'PENGAWAS_REJECTED_SUBMISSION',
                    module: 'Pengawasan Risiko',
                    description: "Pengawas {$pengawasUser->name} mengembalikan berkas OPD {$lockedSubmission->opd?->nama} ke Auditor untuk ditindaklanjuti",
                    user: $pengawasUser,
                    context: [
                        'pengajuan_id' => $lockedSubmission->id,
                        'form_code' => $cleanFormCode,
                    ],
                    auditableType: PengajuanPenilaianRisiko::class,
                    auditableId: $lockedSubmission->id,
                );
            } elseif ($allRequiredApproved) {
                $lockedSubmission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_APPROVED,
                    'current_tier' => PengajuanPenilaianRisiko::TIER_COMPLETED,
                    'pengawas_id' => $pengawasUser->id,
                    'pengawas_approved_at' => now(),
                    'approved_by' => $pengawasUser->id,
                    'approved_at' => now(),
                ]);

                PengajuanPenilaianRisikoHistory::create([
                    'pengajuan_id' => $lockedSubmission->id,
                    'action' => 'all_approved',
                    'catatan' => 'Seluruh formulir pengelolaan risiko telah disahkan final oleh Pengawas (Inspektorat).',
                    'user_id' => $pengawasUser->id,
                    'created_at' => now(),
                ]);

                $this->auditLogService->log(
                    action: 'PENGAWAS_FINAL_APPROVED',
                    module: 'Pengawasan Risiko',
                    description: "Pengawas {$pengawasUser->name} mengesahkan secara final dokumen pengelolaan risiko OPD {$lockedSubmission->opd?->nama}",
                    user: $pengawasUser,
                    context: [
                        'pengajuan_id' => $lockedSubmission->id,
                    ],
                    auditableType: PengajuanPenilaianRisiko::class,
                    auditableId: $lockedSubmission->id,
                );
            } else {
                $lockedSubmission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_IN_REVIEW_PENGAWAS,
                ]);
            }

            return $item->fresh(['reviewedBy:id,name']);
        });
    }
}
