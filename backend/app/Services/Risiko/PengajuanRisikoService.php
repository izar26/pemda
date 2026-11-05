<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoHistory;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PengajuanRisikoService
{
    public const REQUIRED_FORM_CODES = ['2b', '2c'];

    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    /**
     * Resolve active evaluation period ID if null.
     */
    protected function resolvePeriodeId(?string $periodeId = null): string
    {
        if ($periodeId) {
            $exists = PeriodePenilaian::where('id', $periodeId)->exists();
            if (! $exists) {
                throw ValidationException::withMessages([
                    'periode_penilaian_id' => ['Periode penilaian tidak valid atau tidak ditemukan.'],
                ]);
            }

            return $periodeId;
        }

        $active = PeriodePenilaian::where('status', 'aktif')->first();
        if (! $active) {
            throw ValidationException::withMessages([
                'periode_penilaian_id' => ['Tidak ada periode penilaian aktif yang ditemukan.'],
            ]);
        }

        return (string) $active->id;
    }

    /**
     * Get or create a submission record for an OPD and Periode.
     */
    public function getOrCreateSubmission(string $opdId, ?string $periodeId = null): PengajuanPenilaianRisiko
    {
        $resolvedPeriodeId = $this->resolvePeriodeId($periodeId);

        // Find active assigned auditor for this OPD if any
        $assignment = AuditorOpdAssignment::where('opd_id', $opdId)
            ->where('is_active', true)
            ->whereHas('auditor')
            ->first();

        $submission = PengajuanPenilaianRisiko::firstOrCreate(
            [
                'opd_id' => $opdId,
                'periode_penilaian_id' => $resolvedPeriodeId,
            ],
            [
                'auditor_id' => $assignment?->auditor_id,
                'status' => PengajuanPenilaianRisiko::STATUS_DRAFT,
                'current_tier' => PengajuanPenilaianRisiko::TIER_OPERATOR,
            ]
        );

        // If auditor assignment updated, sync it
        if ($assignment && $submission->auditor_id !== $assignment->auditor_id && ! $submission->isApproved()) {
            $submission->update(['auditor_id' => $assignment->auditor_id]);
        } elseif (! $assignment && $submission->auditor_id !== null && ! $submission->isApproved()) {
            $submission->update(['auditor_id' => null]);
        }

        // Ensure required items exist
        foreach (self::REQUIRED_FORM_CODES as $code) {
            PengajuanPenilaianRisikoItem::firstOrCreate(
                [
                    'pengajuan_id' => $submission->id,
                    'form_code' => $code,
                ],
                [
                    'status' => PengajuanPenilaianRisikoItem::STATUS_DRAFT,
                ]
            );
        }

        return $submission->load([
            'opd:id,kode,nama,kategori',
            'periodePenilaian:id,nama_periode,tahun_mulai,tahun_akhir',
            'auditor:id,name,nip,email,jabatan',
            'kepalaOpd:id,name,nip,email,jabatan',
            'pengawas:id,name,nip,email,jabatan',
            'submittedBy:id,name',
            'approvedBy:id,name',
            'items.reviewedBy:id,name',
            'histories.user:id,name',
        ]);
    }

    /**
     * Check submission readiness and completeness of all required forms.
     *
     * @return array<string, mixed>
     */
    public function checkReadiness(string $opdId, ?string $periodeId = null, ?User $currentUser = null): array
    {
        $resolvedPeriodeId = $this->resolvePeriodeId($periodeId);
        $submission = $this->getOrCreateSubmission($opdId, $resolvedPeriodeId);

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
     * Submit risk management forms by OPD Operator to Kepala OPD.
     */
    public function submitToKepalaOpd(string $opdId, ?string $periodeId, User $user, ?string $catatan = null): PengajuanPenilaianRisiko
    {
        $resolvedPeriodeId = $this->resolvePeriodeId($periodeId);
        $readiness = $this->checkReadiness($opdId, $resolvedPeriodeId, $user);

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

            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $lockedSubmission->id,
                'action' => 'resubmitted_to_pengawas',
                'catatan' => $catatan ?: 'Auditor telah melengkapi klarifikasi dan mengirimkan kembali berkas kepada Pengawas.',
                'user_id' => $auditorUser->id,
                'created_at' => now(),
            ]);

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
            } else {
                $lockedSubmission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_IN_REVIEW_PENGAWAS,
                ]);
            }

            return $item->fresh(['reviewedBy:id,name']);
        });
    }

    /**
     * Get list of OPD risk submissions for an auditor or inspectorate.
     *
     * @param  array<string, mixed>  $filters
     */
    public function getAuditorReviewList(User $user, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $resolvedPeriodeId = $this->resolvePeriodeId($filters['periode_penilaian_id'] ?? null);

        $query = Opd::query()->where('is_active', true);

        // Scope to auditor's assigned OPDs if role is Auditor (and not Superadmin / Inspektorat)
        $isSpecialAdmin = $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat']);
        if (! $isSpecialAdmin && $user->hasRole('Auditor')) {
            $assignedOpdIds = $user->activeAssignedOpdIds();

            $query->whereIn('id', $assignedOpdIds);
        }

        // Scope to Executive's own OPD if Executive
        if ($user->hasRole('Executive') && ! $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat']) && $user->opd_id) {
            $query->where('id', $user->opd_id);
        }

        if (! empty($filters['search'])) {
            $term = trim((string) $filters['search']);
            $lower = strtolower($term);
            $query->where(function ($q) use ($lower) {
                $q->whereRaw('LOWER(nama) LIKE ?', ["%{$lower}%"])
                    ->orWhereRaw('LOWER(kode) LIKE ?', ["%{$lower}%"])
                    ->orWhereHas('auditorAssignments', function ($aq) use ($lower) {
                        $aq->where('is_active', true)
                            ->whereHas('auditor', function ($uq) use ($lower) {
                                $uq->whereRaw('LOWER(name) LIKE ?', ["%{$lower}%"])
                                    ->orWhereRaw('LOWER(nip) LIKE ?', ["%{$lower}%"]);
                            });
                    });
            });
        }

        if (! empty($filters['auditor_id'])) {
            $query->whereHas('auditorAssignments', function ($q) use ($filters) {
                $q->where('auditor_id', $filters['auditor_id'])->where('is_active', true);
            });
        }

        // Filter by current tier
        if (! empty($filters['tier']) && ! in_array($filters['tier'], ['semua', 'all'], true)) {
            $tier = (string) $filters['tier'];
            $query->whereHas('pengajuanRisiko', function ($sq) use ($resolvedPeriodeId, $tier) {
                $sq->where('periode_penilaian_id', $resolvedPeriodeId)
                    ->where('current_tier', $tier);
            });
        }

        // Filter by submission status
        if (! empty($filters['status']) && ! in_array($filters['status'], ['semua', 'all'], true)) {
            $status = (string) $filters['status'];
            if (in_array($status, ['belum_mengirim', 'draft'], true)) {
                $query->where(function ($q) use ($resolvedPeriodeId) {
                    $q->whereDoesntHave('pengajuanRisiko', function ($sq) use ($resolvedPeriodeId) {
                        $sq->where('periode_penilaian_id', $resolvedPeriodeId);
                    })->orWhereHas('pengajuanRisiko', function ($sq) use ($resolvedPeriodeId) {
                        $sq->where('periode_penilaian_id', $resolvedPeriodeId)
                            ->where('status', PengajuanPenilaianRisiko::STATUS_DRAFT);
                    });
                });
            } elseif (in_array($status, ['submitted', 'in_review', 'menunggu_review'], true)) {
                $query->whereHas('pengajuanRisiko', function ($sq) use ($resolvedPeriodeId) {
                    $sq->where('periode_penilaian_id', $resolvedPeriodeId)
                        ->whereIn('status', [
                            PengajuanPenilaianRisiko::STATUS_SUBMITTED,
                            PengajuanPenilaianRisiko::STATUS_IN_REVIEW,
                            PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA,
                            PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
                            PengajuanPenilaianRisiko::STATUS_IN_REVIEW_AUDITOR,
                            PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS,
                            PengajuanPenilaianRisiko::STATUS_IN_REVIEW_PENGAWAS,
                        ]);
                });
            } elseif (in_array($status, ['revision_requested', 'perlu_revisi'], true)) {
                $query->whereHas('pengajuanRisiko', function ($sq) use ($resolvedPeriodeId) {
                    $sq->where('periode_penilaian_id', $resolvedPeriodeId)
                        ->whereIn('status', [
                            PengajuanPenilaianRisiko::STATUS_REVISION_REQUESTED,
                            PengajuanPenilaianRisiko::STATUS_REVISION_BY_KEPALA,
                            PengajuanPenilaianRisiko::STATUS_REVISION_BY_AUDITOR,
                            PengajuanPenilaianRisiko::STATUS_REVISION_TO_OPERATOR,
                            PengajuanPenilaianRisiko::STATUS_REVISION_BY_PENGAWAS,
                        ]);
                });
            } elseif (in_array($status, ['approved', 'disetujui'], true)) {
                $query->whereHas('pengajuanRisiko', function ($sq) use ($resolvedPeriodeId) {
                    $sq->where('periode_penilaian_id', $resolvedPeriodeId)
                        ->where('status', PengajuanPenilaianRisiko::STATUS_APPROVED);
                });
            } else {
                $query->whereHas('pengajuanRisiko', function ($sq) use ($resolvedPeriodeId, $status) {
                    $sq->where('periode_penilaian_id', $resolvedPeriodeId)
                        ->where('status', $status);
                });
            }
        }

        $query->with([
            'auditorAssignments' => fn ($q) => $q->where('is_active', true)->with('auditor:id,name,nip,email'),
            'pengajuanRisiko' => fn ($q) => $q->where('periode_penilaian_id', $resolvedPeriodeId)->with(['items', 'kepalaOpd:id,name', 'pengawas:id,name']),
        ]);

        return $query->orderBy('nama', 'asc')->paginate($perPage);
    }

    /**
     * Get review detail of an OPD submission.
     */
    public function getSubmissionDetail(string $submissionId, User $user): PengajuanPenilaianRisiko
    {
        $submission = PengajuanPenilaianRisiko::with([
            'opd:id,kode,nama,kategori',
            'periodePenilaian:id,nama_periode,tahun_mulai,tahun_akhir',
            'auditor:id,name,nip,email,jabatan',
            'kepalaOpd:id,name,nip,email,jabatan',
            'pengawas:id,name,nip,email,jabatan',
            'submittedBy:id,name',
            'approvedBy:id,name',
            'items.reviewedBy:id,name',
            'histories.user:id,name',
        ])->findOrFail($submissionId);

        // Authorization check: If user is Auditor, verify assignment
        $isSpecialAdmin = $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat']);
        if (! $isSpecialAdmin && $user->hasRole('Auditor')) {
            $hasAssignment = AuditorOpdAssignment::where('auditor_id', $user->id)
                ->where('opd_id', $submission->opd_id)
                ->where('is_active', true)
                ->exists() || ($submission->auditor_id === $user->id);

            if (! $hasAssignment) {
                abort(403, 'Anda tidak ditugaskan sebagai auditor pengawas untuk perangkat daerah ini.');
            }
        }

        // Authorization check: If user is Executive, verify opd
        if ($user->hasRole('Executive') && ! $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat']) && $user->opd_id) {
            if ((string) $user->opd_id !== (string) $submission->opd_id) {
                abort(403, 'Anda tidak memiliki hak akses untuk memeriksa perangkat daerah lain.');
            }
        }

        // Auto-transition to in_review status if appropriate
        if ($submission->status === PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR
            && $user->hasRole(['Auditor', 'Inspektorat', 'Superadmin'])) {
            $submission->update(['status' => PengajuanPenilaianRisiko::STATUS_IN_REVIEW_AUDITOR]);
            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $submission->id,
                'action' => 'in_review_auditor',
                'catatan' => 'Auditor mulai meninjau lembar kerja risiko OPD.',
                'user_id' => $user->id,
                'created_at' => now(),
            ]);
        } elseif ($submission->status === PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS
            && $user->hasRole(['Inspektorat', 'Superadmin'])) {
            $submission->update(['status' => PengajuanPenilaianRisiko::STATUS_IN_REVIEW_PENGAWAS]);
            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $submission->id,
                'action' => 'in_review_pengawas',
                'catatan' => 'Pengawas APIP mulai meninjau berkas untuk pengesahan.',
                'user_id' => $user->id,
                'created_at' => now(),
            ]);
        } elseif ($submission->status === PengajuanPenilaianRisiko::STATUS_SUBMITTED
            && $user->hasRole(['Auditor', 'Inspektorat', 'Superadmin'])) {
            $submission->update(['status' => PengajuanPenilaianRisiko::STATUS_IN_REVIEW]);
            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $submission->id,
                'action' => 'in_review',
                'catatan' => 'Auditor mulai meninjau lembar kerja risiko.',
                'user_id' => $user->id,
                'created_at' => now(),
            ]);
        }

        return $submission->fresh([
            'opd',
            'periodePenilaian',
            'auditor',
            'kepalaOpd',
            'pengawas',
            'items.reviewedBy',
            'histories.user',
        ]);
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

        $resolvedPeriodeId = $this->resolvePeriodeId($periodeId);

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
