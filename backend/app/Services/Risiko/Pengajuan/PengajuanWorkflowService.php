<?php

declare(strict_types=1);

namespace App\Services\Risiko\Pengajuan;

use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoHistory;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use App\Services\Risiko\Registry\RiskFormRegistry;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PengajuanWorkflowService
{
    public const REQUIRED_FORM_CODES = ['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7', '8', '9', '10', 'fra'];

    public function __construct(
        protected PengajuanQueryService $queryService,
        protected PengajuanReadinessService $readinessService,
        protected AuditLogService $auditLogService,
        protected RiskFormRegistry $registry
    ) {}

    /**
     * Submit initial draft or resubmit revised form(s) from Operator OPD to Kepala OPD.
     */
    public function submitToKepalaOpd(
        string $opdId,
        ?string $periodeId,
        User $user,
        ?string $catatan = null,
        ?string $formCode = null
    ): PengajuanPenilaianRisiko {
        $resolvedPeriodeId = $this->queryService->resolvePeriodeId($periodeId);
        $readiness = $this->readinessService->checkReadiness($opdId, $resolvedPeriodeId, $user);

        if (! $readiness['has_auditor']) {
            throw ValidationException::withMessages([
                'auditor' => ['OPD Anda belum memiliki Auditor Pengawas yang ditugaskan oleh Inspektorat. Pengajuan tidak dapat dilakukan.'],
            ]);
        }

        /** @var PengajuanPenilaianRisiko $submission */
        $submission = $readiness['submission'];
        $cleanFormCode = $formCode ? strtolower(trim($formCode)) : null;

        if ($submission->isDraft()) {
            if (! $readiness['all_forms_complete']) {
                $missingNames = array_column($readiness['missing_forms'], 'name');
                throw ValidationException::withMessages([
                    'forms' => ['Seluruh lembar kerja ('.implode(', ', $missingNames).') wajib dilengkapi terlebih dahulu sebelum diajukan.'],
                ]);
            }

            return DB::transaction(function () use ($submission, $readiness, $user, $catatan) {
                $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);
                if (! $lockedSubmission || ! $lockedSubmission->isDraft()) {
                    throw ValidationException::withMessages([
                        'status' => ['Lembar kerja risiko Anda sedang dalam proses verifikasi berjenjang atau telah disetujui (read-only).'],
                    ]);
                }

                $codes = $this->registry->getCodes();
                $lockedSubmission->update([
                    'auditor_id' => $readiness['assigned_auditor']?->id ?? $lockedSubmission->auditor_id,
                    'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA,
                    'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
                    'submitted_at' => now(),
                    'submitted_by' => $user->id,
                ]);

                foreach ($codes as $code) {
                    $item = PengajuanPenilaianRisikoItem::firstOrCreate(
                        [
                            'pengajuan_id' => $lockedSubmission->id,
                            'form_code' => $code,
                        ],
                        [
                            'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
                            'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                            'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                        ]
                    );

                    $item->update([
                        'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
                        'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                        'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    ]);
                }

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

                return $this->freshSubmission($lockedSubmission);
            });
        }

        // Resubmission of revised form(s) currently sitting at TIER_OPERATOR
        if ($submission->isLockedForOperator()) {
            throw ValidationException::withMessages([
                'status' => ['Lembar kerja risiko Anda sedang dalam proses verifikasi berjenjang atau telah disetujui (read-only).'],
            ]);
        }

        return DB::transaction(function () use ($submission, $readiness, $user, $catatan, $cleanFormCode, $opdId, $resolvedPeriodeId) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);
            if (! $lockedSubmission) {
                throw ValidationException::withMessages(['status' => ['Pengajuan tidak ditemukan.']]);
            }

            $operatorItemsQuery = $lockedSubmission->items()
                ->where('current_tier', PengajuanPenilaianRisiko::TIER_OPERATOR);

            if ($cleanFormCode) {
                $item = (clone $operatorItemsQuery)->where('form_code', $cleanFormCode)->first();
                if (! $item) {
                    throw ValidationException::withMessages([
                        'form_code' => ["Form {$cleanFormCode} tidak sedang dalam status revisi Operator."],
                    ]);
                }

                $handler = $this->registry->get($cleanFormCode);
                if (! $handler->isComplete($opdId, $resolvedPeriodeId) && $handler->isRequired($lockedSubmission)) {
                    throw ValidationException::withMessages([
                        'forms' => ["{$handler->getName()} belum lengkap: {$handler->getIncompleteMessage()}"],
                    ]);
                }

                $itemsToResubmit = collect([$item]);
            } else {
                $itemsToResubmit = $operatorItemsQuery->get();
                if ($itemsToResubmit->isEmpty()) {
                    throw ValidationException::withMessages([
                        'status' => ['Tidak ada formulir yang sedang dalam tahap perbaikan Operator.'],
                    ]);
                }

                if (! $readiness['all_forms_complete']) {
                    $missingNames = array_column($readiness['missing_forms'], 'name');
                    throw ValidationException::withMessages([
                        'forms' => ['Seluruh lembar kerja ('.implode(', ', $missingNames).') wajib dilengkapi terlebih dahulu sebelum diajukan ulang.'],
                    ]);
                }
            }

            foreach ($itemsToResubmit as $item) {
                $item->update([
                    'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
                    'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                ]);

                $upperCode = strtoupper((string) $item->form_code);
                PengajuanPenilaianRisikoHistory::create([
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_code' => $item->form_code,
                    'action' => 'operator_resubmitted_item',
                    'catatan' => $catatan ?: "Operator OPD mengajukan ulang perbaikan Form {$upperCode} kepada Kepala OPD.",
                    'user_id' => $user->id,
                    'created_at' => now(),
                ]);
            }

            // Restore legacy parent status if all operator revisions have been returned
            $remainingAtOperator = $lockedSubmission->items()
                ->where('current_tier', PengajuanPenilaianRisiko::TIER_OPERATOR)
                ->exists();

            if (! $remainingAtOperator && in_array($lockedSubmission->status, [
                PengajuanPenilaianRisiko::STATUS_REVISION_BY_KEPALA,
                PengajuanPenilaianRisiko::STATUS_REVISION_TO_OPERATOR,
            ], true)) {
                $lockedSubmission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA,
                    'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
                ]);
            }

            $this->auditLogService->log(
                action: 'OPERATOR_RESUBMIT_REVISION',
                module: 'Pengelolaan Risiko',
                description: "Operator {$user->name} mengajukan ulang perbaikan (".$itemsToResubmit->pluck('form_code')->implode(', ').") OPD {$lockedSubmission->opd?->nama} ke Kepala OPD",
                user: $user,
                context: [
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_codes' => $itemsToResubmit->pluck('form_code')->all(),
                    'catatan' => $catatan,
                ],
                auditableType: PengajuanPenilaianRisiko::class,
                auditableId: $lockedSubmission->id,
            );

            return $this->freshSubmission($lockedSubmission);
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
     * Review a single form item by Kepala OPD (Approve or Reject per-form without blocking other forms).
     */
    public function reviewByKepalaOpd(
        string $submissionId,
        string $status,
        ?string $catatan,
        User $kepalaOpdUser,
        ?string $formCode = null
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
                    'catatan' => ['Catatan revisi wajib diisi minimal 5 karakter apabila formulir ditolak.'],
                ]);
            }
        }

        $cleanFormCode = $formCode ? strtolower(trim($formCode)) : null;
        if (! $cleanFormCode) {
            throw ValidationException::withMessages([
                'form_code' => ['Kode formulir wajib disertakan untuk persetujuan atau penolakan per-form.'],
            ]);
        }

        $submission = PengajuanPenilaianRisiko::with('items')->findOrFail($submissionId);
        $this->assertKepalaOpdAuthorized($kepalaOpdUser, $submission, 'Hanya Kepala OPD bersangkutan atau Administrator yang berhak melakukan persetujuan tingkat internal OPD.');

        if ($submission->isDraft() || $submission->isApproved()) {
            throw ValidationException::withMessages([
                'status' => ['Pengajuan saat ini tidak berada dalam tahap peninjauan Kepala OPD.'],
            ]);
        }

        return DB::transaction(function () use ($submission, $status, $catatan, $kepalaOpdUser, $cleanFormCode) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);
            if (! $lockedSubmission) {
                throw ValidationException::withMessages(['status' => ['Pengajuan tidak ditemukan.']]);
            }

            $item = $lockedSubmission->items()->where('form_code', $cleanFormCode)->first();
            if (! $item) {
                throw ValidationException::withMessages([
                    'form_code' => ['Formulir tidak tersedia dalam pengajuan ini.'],
                ]);
            }

            if ($item->current_tier !== PengajuanPenilaianRisiko::TIER_KEPALA_OPD) {
                throw ValidationException::withMessages([
                    'form_code' => ['Formulir ini tidak sedang berada pada tahap peninjauan Kepala OPD.'],
                ]);
            }

            $upperCode = strtoupper($cleanFormCode);

            if ($status === 'rejected') {
                $item->update([
                    'current_tier' => PengajuanPenilaianRisiko::TIER_OPERATOR,
                    'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
                    'catatan_kepala_opd' => $catatan,
                    'status' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
                    'catatan_revisi' => $catatan,
                    'reviewed_at' => now(),
                    'reviewed_by' => $kepalaOpdUser->id,
                ]);

                PengajuanPenilaianRisikoHistory::create([
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_code' => $cleanFormCode,
                    'action' => 'rejected_by_kepala_opd',
                    'catatan' => "Kepala OPD meminta revisi Form {$upperCode}: {$catatan}",
                    'user_id' => $kepalaOpdUser->id,
                    'created_at' => now(),
                ]);

                $this->auditLogService->log(
                    action: 'KEPALA_OPD_REJECTED_ITEM',
                    module: 'Pengelolaan Risiko',
                    description: "Kepala OPD {$kepalaOpdUser->name} meminta revisi Form {$upperCode} OPD {$lockedSubmission->opd?->nama}: {$catatan}",
                    user: $kepalaOpdUser,
                    context: [
                        'pengajuan_id' => $lockedSubmission->id,
                        'opd_id' => $lockedSubmission->opd_id,
                        'form_code' => $cleanFormCode,
                        'catatan' => $catatan,
                    ],
                    auditableType: PengajuanPenilaianRisikoItem::class,
                    auditableId: $item->id,
                );
            } else {
                $parentBeyondKepala = in_array($lockedSubmission->current_tier, [
                    PengajuanPenilaianRisiko::TIER_AUDITOR,
                    PengajuanPenilaianRisiko::TIER_PENGAWAS,
                ], true);

                if ($parentBeyondKepala) {
                    // Revision approved by Kepala OPD: return directly up to Evaluator for re-review
                    $item->update([
                        'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
                        'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_APPROVED,
                        'catatan_kepala_opd' => null,
                        'status_auditor' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                        'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                        'reviewed_at' => now(),
                        'reviewed_by' => $kepalaOpdUser->id,
                    ]);
                } else {
                    $item->update([
                        'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
                        'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_APPROVED,
                        'catatan_kepala_opd' => null,
                        'status' => PengajuanPenilaianRisikoItem::STATUS_APPROVED,
                        'reviewed_at' => now(),
                        'reviewed_by' => $kepalaOpdUser->id,
                    ]);
                }

                PengajuanPenilaianRisikoHistory::create([
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_code' => $cleanFormCode,
                    'action' => 'kepala_opd_approved_item',
                    'catatan' => $catatan ?: ($parentBeyondKepala
                        ? "Kepala OPD menyetujui ulang perbaikan Form {$upperCode} dan mengembalikannya ke Evaluator."
                        : "Kepala OPD menyetujui Form {$upperCode}."),
                    'user_id' => $kepalaOpdUser->id,
                    'created_at' => now(),
                ]);

                $this->auditLogService->log(
                    action: 'KEPALA_OPD_APPROVED_ITEM',
                    module: 'Pengelolaan Risiko',
                    description: "Kepala OPD {$kepalaOpdUser->name} menyetujui Form {$upperCode} OPD {$lockedSubmission->opd?->nama}",
                    user: $kepalaOpdUser,
                    context: [
                        'pengajuan_id' => $lockedSubmission->id,
                        'opd_id' => $lockedSubmission->opd_id,
                        'form_code' => $cleanFormCode,
                        'catatan' => $catatan,
                    ],
                    auditableType: PengajuanPenilaianRisikoItem::class,
                    auditableId: $item->id,
                );
            }

            return $this->freshSubmission($lockedSubmission);
        });
    }

    /**
     * Explicit forward from Kepala OPD to Evaluator (only permitted when 100% forms are approved).
     */
    public function forwardToAuditor(
        string $submissionId,
        ?string $catatan,
        User $kepalaOpdUser
    ): PengajuanPenilaianRisiko {
        $submission = PengajuanPenilaianRisiko::with('items')->findOrFail($submissionId);
        $this->assertKepalaOpdAuthorized($kepalaOpdUser, $submission, 'Hanya Kepala OPD bersangkutan atau Administrator yang berhak mengirim berkas ke Evaluator.');

        if ($submission->current_tier !== PengajuanPenilaianRisiko::TIER_KEPALA_OPD) {
            throw ValidationException::withMessages([
                'status' => ['Pengajuan tidak berada pada tahap persetujuan Kepala OPD.'],
            ]);
        }

        return DB::transaction(function () use ($submission, $catatan, $kepalaOpdUser) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);
            if (! $lockedSubmission || $lockedSubmission->current_tier !== PengajuanPenilaianRisiko::TIER_KEPALA_OPD) {
                throw ValidationException::withMessages(['status' => ['Pengajuan tidak berada pada tahap persetujuan Kepala OPD.']]);
            }

            $allItems = $lockedSubmission->items()->get();
            $requiredItems = $allItems->whereIn('form_code', $this->registry->getCodes());

            $notReadyCount = $requiredItems->filter(function (PengajuanPenilaianRisikoItem $item) {
                return $item->current_tier !== PengajuanPenilaianRisiko::TIER_KEPALA_OPD
                    || $item->status_kepala_opd !== PengajuanPenilaianRisikoItem::STATUS_APPROVED;
            })->count();

            if ($requiredItems->isEmpty() || $notReadyCount > 0) {
                throw ValidationException::withMessages([
                    'status' => ['Seluruh formulir wajib disetujui (100% hijau dan tidak ada yang sedang direvisi) sebelum dapat dikirim ke Evaluator.'],
                ]);
            }

            $lockedSubmission->update([
                'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
                'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
                'kepala_opd_id' => $kepalaOpdUser->id,
                'kepala_opd_approved_at' => now(),
            ]);

            foreach ($allItems as $item) {
                $item->update([
                    'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
                    'status_auditor' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                ]);
            }

            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $lockedSubmission->id,
                'action' => 'approved_by_kepala_opd',
                'catatan' => $catatan ?: 'Seluruh formulir disetujui Kepala OPD dan resmi dikirim kepada Evaluator APIP.',
                'user_id' => $kepalaOpdUser->id,
                'created_at' => now(),
            ]);

            $this->auditLogService->log(
                action: 'KEPALA_OPD_FORWARDED_TO_AUDITOR',
                module: 'Pengelolaan Risiko',
                description: "Kepala OPD {$kepalaOpdUser->name} mengirim berkas OPD {$lockedSubmission->opd?->nama} ke Evaluator APIP",
                user: $kepalaOpdUser,
                context: [
                    'pengajuan_id' => $lockedSubmission->id,
                    'opd_id' => $lockedSubmission->opd_id,
                    'catatan' => $catatan,
                ],
                auditableType: PengajuanPenilaianRisiko::class,
                auditableId: $lockedSubmission->id,
            );

            return $this->freshSubmission($lockedSubmission);
        });
    }

    /**
     * Delegate revision returned from Auditor down to Operator OPD (per-form or all returned forms).
     */
    public function delegateRevisionToOperator(
        string $submissionId,
        ?string $catatan,
        User $kepalaOpdUser,
        ?string $formCode = null
    ): PengajuanPenilaianRisiko {
        $submission = PengajuanPenilaianRisiko::with('items')->findOrFail($submissionId);
        $this->assertKepalaOpdAuthorized($kepalaOpdUser, $submission, 'Hanya Kepala OPD bersangkutan atau Administrator yang berhak mendelegasikan revisi ke Operator.');

        $cleanFormCode = $formCode ? strtolower(trim($formCode)) : null;

        return DB::transaction(function () use ($submission, $catatan, $kepalaOpdUser, $cleanFormCode) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);
            if (! $lockedSubmission) {
                throw ValidationException::withMessages(['status' => ['Pengajuan tidak ditemukan.']]);
            }

            $query = $lockedSubmission->items()
                ->where('current_tier', PengajuanPenilaianRisiko::TIER_KEPALA_OPD);

            if ($cleanFormCode) {
                $item = (clone $query)->where('form_code', $cleanFormCode)->first();
                if (! $item) {
                    throw ValidationException::withMessages([
                        'form_code' => ['Formulir tidak berada pada tahap delegasi Kepala OPD.'],
                    ]);
                }
                $itemsToDelegate = collect([$item]);
            } else {
                $itemsToDelegate = (clone $query)
                    ->where('status_auditor', PengajuanPenilaianRisikoItem::STATUS_REJECTED)
                    ->get();

                if ($itemsToDelegate->isEmpty()) {
                    throw ValidationException::withMessages([
                        'status' => ['Tidak ada formulir revisi dari Evaluator yang menunggu delegasi Kepala OPD.'],
                    ]);
                }
            }

            foreach ($itemsToDelegate as $item) {
                $effectiveNote = trim((string) $catatan) !== ''
                    ? trim((string) $catatan)
                    : trim((string) ($item->catatan_auditor ?: $item->catatan_revisi));

                if (strlen($effectiveNote) < 5) {
                    throw ValidationException::withMessages([
                        'catatan' => ['Catatan revisi wajib diisi minimal 5 karakter saat mendelegasikan ke Operator.'],
                    ]);
                }

                $item->update([
                    'current_tier' => PengajuanPenilaianRisiko::TIER_OPERATOR,
                    'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
                    'catatan_kepala_opd' => $effectiveNote,
                    'status' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
                    'catatan_revisi' => $effectiveNote,
                    'reviewed_at' => now(),
                    'reviewed_by' => $kepalaOpdUser->id,
                ]);

                $upperCode = strtoupper((string) $item->form_code);
                PengajuanPenilaianRisikoHistory::create([
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_code' => $item->form_code,
                    'action' => 'delegated_to_operator',
                    'catatan' => "Kepala OPD mendelegasikan revisi Form {$upperCode} ke Operator: {$effectiveNote}",
                    'user_id' => $kepalaOpdUser->id,
                    'created_at' => now(),
                ]);
            }

            $this->auditLogService->log(
                action: 'KEPALA_OPD_DELEGATED_REVISION',
                module: 'Pengelolaan Risiko',
                description: "Kepala OPD {$kepalaOpdUser->name} mendelegasikan revisi (".$itemsToDelegate->pluck('form_code')->implode(', ').") OPD {$lockedSubmission->opd?->nama} ke Operator",
                user: $kepalaOpdUser,
                context: [
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_codes' => $itemsToDelegate->pluck('form_code')->all(),
                    'catatan' => $catatan,
                ],
                auditableType: PengajuanPenilaianRisiko::class,
                auditableId: $lockedSubmission->id,
            );

            return $this->freshSubmission($lockedSubmission);
        });
    }

    /**
     * Evaluator reviews a single form item (Approve or Reject per-form without disabling reviewer).
     */
    public function reviewByAuditor(
        string $submissionId,
        string $formCode,
        string $status,
        ?string $catatanRevisi,
        User $auditorUser
    ): PengajuanPenilaianRisikoItem {
        $cleanFormCode = strtolower(trim($formCode));
        if (! in_array($cleanFormCode, $this->registry->getCodes(), true)) {
            throw ValidationException::withMessages([
                'form_code' => ['Kode formulir tidak valid.'],
            ]);
        }

        if (! in_array($status, [PengajuanPenilaianRisikoItem::STATUS_APPROVED, PengajuanPenilaianRisikoItem::STATUS_REJECTED], true)) {
            throw ValidationException::withMessages([
                'status' => ['Status review harus berupa disetujui (approved) atau ditolak (rejected).'],
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
        $this->assertAuditorAuthorized($auditorUser, $submission);

        if ($submission->isDraft() || $submission->current_tier === PengajuanPenilaianRisiko::TIER_OPERATOR || $submission->current_tier === PengajuanPenilaianRisiko::TIER_KEPALA_OPD) {
            throw ValidationException::withMessages([
                'submission' => ['Lembar kerja risiko belum diajukan oleh Kepala OPD kepada Evaluator.'],
            ]);
        }

        return DB::transaction(function () use ($submission, $cleanFormCode, $status, $catatanRevisi, $auditorUser) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);
            if (! $lockedSubmission) {
                throw ValidationException::withMessages(['submission' => ['Pengajuan tidak ditemukan.']]);
            }

            $item = $lockedSubmission->items()->where('form_code', $cleanFormCode)->first();
            if (! $item) {
                throw ValidationException::withMessages([
                    'form_code' => ['Formulir tidak tersedia untuk pengajuan ini.'],
                ]);
            }

            if ($item->current_tier !== PengajuanPenilaianRisiko::TIER_AUDITOR) {
                throw ValidationException::withMessages([
                    'form_code' => ['Formulir ini tidak sedang berada pada tahap pemeriksaan Evaluator.'],
                ]);
            }

            $upperCode = strtoupper($cleanFormCode);

            if ($status === PengajuanPenilaianRisikoItem::STATUS_REJECTED) {
                $item->update([
                    'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
                    'status_auditor' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
                    'catatan_auditor' => $catatanRevisi,
                    'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    'status' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
                    'catatan_revisi' => $catatanRevisi,
                    'reviewed_at' => now(),
                    'reviewed_by' => $auditorUser->id,
                ]);
            } else {
                $parentAtPengawas = $lockedSubmission->current_tier === PengajuanPenilaianRisiko::TIER_PENGAWAS;
                if ($parentAtPengawas) {
                    // Returning upward from Pengawas revision: immediately back to Pengawas
                    $item->update([
                        'current_tier' => PengajuanPenilaianRisiko::TIER_PENGAWAS,
                        'status_auditor' => PengajuanPenilaianRisikoItem::STATUS_APPROVED,
                        'catatan_auditor' => null,
                        'status_pengawas' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                        'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                        'reviewed_at' => now(),
                        'reviewed_by' => $auditorUser->id,
                    ]);
                } else {
                    $item->update([
                        'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
                        'status_auditor' => PengajuanPenilaianRisikoItem::STATUS_APPROVED,
                        'catatan_auditor' => null,
                        'status' => PengajuanPenilaianRisikoItem::STATUS_APPROVED,
                        'reviewed_at' => now(),
                        'reviewed_by' => $auditorUser->id,
                    ]);
                }
            }

            if ($lockedSubmission->current_tier === PengajuanPenilaianRisiko::TIER_AUDITOR
                && in_array($lockedSubmission->status, [
                    PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
                    PengajuanPenilaianRisiko::STATUS_SUBMITTED,
                ], true)) {
                $lockedSubmission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_IN_REVIEW_AUDITOR,
                ]);
            }

            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $lockedSubmission->id,
                'form_code' => $cleanFormCode,
                'action' => $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED ? 'auditor_approved_item' : 'auditor_rejected_item',
                'catatan' => $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED
                    ? "Form {$upperCode} disetujui oleh Evaluator."
                    : "Form {$upperCode} ditolak oleh Evaluator: {$catatanRevisi}",
                'user_id' => $auditorUser->id,
                'created_at' => now(),
            ]);

            $this->auditLogService->log(
                action: $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED ? 'AUDITOR_APPROVE_ITEM' : 'AUDITOR_REJECT_ITEM',
                module: 'Pengawasan Risiko',
                description: "Evaluator {$auditorUser->name} ".($status === PengajuanPenilaianRisikoItem::STATUS_APPROVED ? 'menyetujui' : 'menolak')." Form {$upperCode} OPD {$lockedSubmission->opd?->nama}",
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
     * Explicit forward from Evaluator to Pengawas (only permitted when 100% forms are approved).
     */
    public function forwardToPengawas(
        string $submissionId,
        ?string $catatan,
        User $auditorUser
    ): PengajuanPenilaianRisiko {
        $submission = PengajuanPenilaianRisiko::with('items')->findOrFail($submissionId);
        $this->assertAuditorAuthorized($auditorUser, $submission);

        if ($submission->current_tier !== PengajuanPenilaianRisiko::TIER_AUDITOR) {
            throw ValidationException::withMessages([
                'status' => ['Pengajuan tidak berada pada tahap pemeriksaan Evaluator.'],
            ]);
        }

        return DB::transaction(function () use ($submission, $catatan, $auditorUser) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);
            if (! $lockedSubmission || $lockedSubmission->current_tier !== PengajuanPenilaianRisiko::TIER_AUDITOR) {
                throw ValidationException::withMessages(['status' => ['Pengajuan tidak berada pada tahap pemeriksaan Evaluator.']]);
            }

            $allItems = $lockedSubmission->items()->get();
            $requiredItems = $allItems->whereIn('form_code', $this->registry->getCodes());

            $notReadyCount = $requiredItems->filter(function (PengajuanPenilaianRisikoItem $item) {
                return $item->current_tier !== PengajuanPenilaianRisiko::TIER_AUDITOR
                    || $item->status_auditor !== PengajuanPenilaianRisikoItem::STATUS_APPROVED;
            })->count();

            if ($requiredItems->isEmpty() || $notReadyCount > 0) {
                throw ValidationException::withMessages([
                    'status' => ['Seluruh formulir wajib disetujui Evaluator (100% hijau dan tidak ada yang sedang direvisi) sebelum dapat dikirim ke Pengawas.'],
                ]);
            }

            $lockedSubmission->update([
                'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS,
                'current_tier' => PengajuanPenilaianRisiko::TIER_PENGAWAS,
                'auditor_reviewed_at' => now(),
            ]);

            foreach ($allItems as $item) {
                $item->update([
                    'current_tier' => PengajuanPenilaianRisiko::TIER_PENGAWAS,
                    'status_pengawas' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                ]);
            }

            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $lockedSubmission->id,
                'action' => 'forwarded_to_pengawas',
                'catatan' => $catatan ?: 'Seluruh formulir disetujui Evaluator dan resmi dikirim kepada Pengawas APIP untuk pengesahan final.',
                'user_id' => $auditorUser->id,
                'created_at' => now(),
            ]);

            $this->auditLogService->log(
                action: 'AUDITOR_FORWARDED_TO_PENGAWAS',
                module: 'Pengawasan Risiko',
                description: "Evaluator {$auditorUser->name} mengirim berkas OPD {$lockedSubmission->opd?->nama} ke Pengawas Inspektorat",
                user: $auditorUser,
                context: [
                    'pengajuan_id' => $lockedSubmission->id,
                    'catatan' => $catatan,
                ],
                auditableType: PengajuanPenilaianRisiko::class,
                auditableId: $lockedSubmission->id,
            );

            return $this->freshSubmission($lockedSubmission);
        });
    }

    /**
     * Evaluator forwards Pengawas rejection down to Kepala OPD (per-form or all returned items).
     */
    public function forwardRevisionFromAuditor(
        string $submissionId,
        ?string $catatan,
        User $auditorUser,
        ?string $formCode = null
    ): PengajuanPenilaianRisiko {
        $submission = PengajuanPenilaianRisiko::findOrFail($submissionId);
        $this->assertAuditorAuthorized($auditorUser, $submission);

        $cleanFormCode = $formCode ? strtolower(trim($formCode)) : null;

        return DB::transaction(function () use ($submission, $catatan, $auditorUser, $cleanFormCode) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);
            if (! $lockedSubmission) {
                throw ValidationException::withMessages(['status' => ['Pengajuan tidak ditemukan.']]);
            }

            $query = $lockedSubmission->items()
                ->where('current_tier', PengajuanPenilaianRisiko::TIER_AUDITOR)
                ->where('status_pengawas', PengajuanPenilaianRisikoItem::STATUS_REJECTED);

            if ($cleanFormCode) {
                $item = (clone $query)->where('form_code', $cleanFormCode)->first();
                if (! $item) {
                    throw ValidationException::withMessages([
                        'form_code' => ['Formulir tidak berada pada status revisi Pengawas di Evaluator.'],
                    ]);
                }
                $itemsToForward = collect([$item]);
            } else {
                $itemsToForward = $query->get();
                if ($itemsToForward->isEmpty()) {
                    throw ValidationException::withMessages([
                        'status' => ['Tidak ada formulir revisi dari Pengawas untuk diteruskan ke Kepala OPD.'],
                    ]);
                }
            }

            foreach ($itemsToForward as $item) {
                $effectiveNote = trim((string) $catatan) !== ''
                    ? trim((string) $catatan)
                    : trim((string) ($item->catatan_pengawas ?: $item->catatan_revisi));

                if (strlen($effectiveNote) < 5) {
                    throw ValidationException::withMessages([
                        'catatan' => ['Catatan revisi wajib diisi minimal 5 karakter saat meneruskan ke Kepala OPD.'],
                    ]);
                }

                $item->update([
                    'current_tier' => PengajuanPenilaianRisiko::TIER_KEPALA_OPD,
                    'status_auditor' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
                    'catatan_auditor' => $effectiveNote,
                    'status_kepala_opd' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    'status' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
                    'catatan_revisi' => $effectiveNote,
                    'reviewed_at' => now(),
                    'reviewed_by' => $auditorUser->id,
                ]);

                $upperCode = strtoupper((string) $item->form_code);
                PengajuanPenilaianRisikoHistory::create([
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_code' => $item->form_code,
                    'action' => 'auditor_forwarded_revision',
                    'catatan' => "Evaluator meneruskan revisi Form {$upperCode} kepada Kepala OPD: {$effectiveNote}",
                    'user_id' => $auditorUser->id,
                    'created_at' => now(),
                ]);
            }

            $this->auditLogService->log(
                action: 'AUDITOR_FORWARD_REVISION_TO_KEPALA',
                module: 'Pengawasan Risiko',
                description: "Evaluator {$auditorUser->name} meneruskan catatan penolakan pengawas (".$itemsToForward->pluck('form_code')->implode(', ').") OPD {$lockedSubmission->opd?->nama} kepada Kepala OPD",
                user: $auditorUser,
                context: [
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_codes' => $itemsToForward->pluck('form_code')->all(),
                    'catatan' => $catatan,
                ],
                auditableType: PengajuanPenilaianRisiko::class,
                auditableId: $lockedSubmission->id,
            );

            return $this->freshSubmission($lockedSubmission);
        });
    }

    /**
     * Evaluator re-submits clarification directly back to Pengawas (per-form or all returned items).
     */
    public function resubmitToPengawas(
        string $submissionId,
        ?string $catatan,
        User $auditorUser,
        ?string $formCode = null
    ): PengajuanPenilaianRisiko {
        $submission = PengajuanPenilaianRisiko::findOrFail($submissionId);
        $this->assertAuditorAuthorized($auditorUser, $submission);

        $cleanFormCode = $formCode ? strtolower(trim($formCode)) : null;

        return DB::transaction(function () use ($submission, $catatan, $auditorUser, $cleanFormCode) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);
            if (! $lockedSubmission) {
                throw ValidationException::withMessages(['status' => ['Pengajuan tidak ditemukan.']]);
            }

            $query = $lockedSubmission->items()
                ->where('current_tier', PengajuanPenilaianRisiko::TIER_AUDITOR)
                ->where('status_pengawas', PengajuanPenilaianRisikoItem::STATUS_REJECTED);

            if ($cleanFormCode) {
                $item = (clone $query)->where('form_code', $cleanFormCode)->first();
                if (! $item) {
                    throw ValidationException::withMessages([
                        'form_code' => ['Formulir tidak berada pada status revisi Pengawas di Evaluator.'],
                    ]);
                }
                $itemsToResubmit = collect([$item]);
            } else {
                $itemsToResubmit = $query->get();
                if ($itemsToResubmit->isEmpty()) {
                    throw ValidationException::withMessages([
                        'status' => ['Tidak ada formulir revisi dari Pengawas untuk diajukan klarifikasi ulang.'],
                    ]);
                }
            }

            foreach ($itemsToResubmit as $item) {
                $item->update([
                    'current_tier' => PengajuanPenilaianRisiko::TIER_PENGAWAS,
                    'status_pengawas' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    'status_auditor' => PengajuanPenilaianRisikoItem::STATUS_APPROVED,
                    'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    'reviewed_at' => now(),
                    'reviewed_by' => $auditorUser->id,
                ]);

                $upperCode = strtoupper((string) $item->form_code);
                PengajuanPenilaianRisikoHistory::create([
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_code' => $item->form_code,
                    'action' => 'auditor_resubmitted_to_pengawas',
                    'catatan' => $catatan ?: "Evaluator mengajukan klarifikasi ulang Form {$upperCode} kepada Pengawas APIP.",
                    'user_id' => $auditorUser->id,
                    'created_at' => now(),
                ]);
            }

            $this->auditLogService->log(
                action: 'AUDITOR_RESUBMIT_TO_PENGAWAS',
                module: 'Pengawasan Risiko',
                description: "Evaluator {$auditorUser->name} mengirim ulang klarifikasi (".$itemsToResubmit->pluck('form_code')->implode(', ').") OPD {$lockedSubmission->opd?->nama} ke Pengawas Inspektorat",
                user: $auditorUser,
                context: [
                    'pengajuan_id' => $lockedSubmission->id,
                    'form_codes' => $itemsToResubmit->pluck('form_code')->all(),
                    'catatan' => $catatan,
                ],
                auditableType: PengajuanPenilaianRisiko::class,
                auditableId: $lockedSubmission->id,
            );

            return $this->freshSubmission($lockedSubmission);
        });
    }

    /**
     * Pengawas reviews a single form item (Approve or Reject per-form without disabling reviewer).
     */
    public function reviewByPengawas(
        string $submissionId,
        string $formCode,
        string $status,
        ?string $catatanRevisi,
        User $pengawasUser
    ): PengajuanPenilaianRisikoItem {
        $cleanFormCode = strtolower(trim($formCode));
        if (! in_array($cleanFormCode, $this->registry->getCodes(), true)) {
            throw ValidationException::withMessages([
                'form_code' => ['Kode formulir tidak valid.'],
            ]);
        }

        if (! in_array($status, [PengajuanPenilaianRisikoItem::STATUS_APPROVED, PengajuanPenilaianRisikoItem::STATUS_REJECTED], true)) {
            throw ValidationException::withMessages([
                'status' => ['Status pengesahan harus berupa disetujui (approved) atau ditolak (rejected).'],
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

        $submission = PengajuanPenilaianRisiko::with('items')->findOrFail($submissionId);
        $this->assertPengawasAuthorized($pengawasUser, $submission);

        if ($submission->current_tier !== PengajuanPenilaianRisiko::TIER_PENGAWAS) {
            throw ValidationException::withMessages([
                'submission' => ['Pengajuan saat ini tidak berada pada tahap pengesahan Pengawas/Inspektorat.'],
            ]);
        }

        return DB::transaction(function () use ($submission, $cleanFormCode, $status, $catatanRevisi, $pengawasUser) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);
            if (! $lockedSubmission) {
                throw ValidationException::withMessages(['submission' => ['Pengajuan tidak ditemukan.']]);
            }

            $item = $lockedSubmission->items()->where('form_code', $cleanFormCode)->first();
            if (! $item) {
                throw ValidationException::withMessages([
                    'form_code' => ['Formulir tidak tersedia untuk pengajuan ini.'],
                ]);
            }

            if ($item->current_tier !== PengajuanPenilaianRisiko::TIER_PENGAWAS) {
                throw ValidationException::withMessages([
                    'form_code' => ['Formulir ini tidak sedang berada pada tahap pengesahan Pengawas.'],
                ]);
            }

            $upperCode = strtoupper($cleanFormCode);

            if ($status === PengajuanPenilaianRisikoItem::STATUS_REJECTED) {
                $item->update([
                    'current_tier' => PengajuanPenilaianRisiko::TIER_AUDITOR,
                    'status_pengawas' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
                    'catatan_pengawas' => $catatanRevisi,
                    'status' => PengajuanPenilaianRisikoItem::STATUS_REJECTED,
                    'catatan_revisi' => $catatanRevisi,
                    'reviewed_at' => now(),
                    'reviewed_by' => $pengawasUser->id,
                ]);
            } else {
                $item->update([
                    'current_tier' => PengajuanPenilaianRisiko::TIER_PENGAWAS,
                    'status_pengawas' => PengajuanPenilaianRisikoItem::STATUS_APPROVED,
                    'catatan_pengawas' => null,
                    'status' => PengajuanPenilaianRisikoItem::STATUS_APPROVED,
                    'reviewed_at' => now(),
                    'reviewed_by' => $pengawasUser->id,
                ]);
            }

            if ($lockedSubmission->status === PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS) {
                $lockedSubmission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_IN_REVIEW_PENGAWAS,
                ]);
            }

            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $lockedSubmission->id,
                'form_code' => $cleanFormCode,
                'action' => $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED ? 'pengawas_approved_item' : 'pengawas_rejected_item',
                'catatan' => $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED
                    ? "Form {$upperCode} disetujui oleh Pengawas Inspektorat."
                    : "Form {$upperCode} ditolak oleh Pengawas Inspektorat: {$catatanRevisi}",
                'user_id' => $pengawasUser->id,
                'created_at' => now(),
            ]);

            $this->auditLogService->log(
                action: $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED ? 'PENGAWAS_APPROVE_ITEM' : 'PENGAWAS_REJECT_ITEM',
                module: 'Pengawasan Risiko',
                description: "Pengawas {$pengawasUser->name} ".($status === PengajuanPenilaianRisikoItem::STATUS_APPROVED ? 'menyetujui' : 'menolak')." Form {$upperCode} OPD {$lockedSubmission->opd?->nama}",
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

            return $item->fresh(['reviewedBy:id,name']);
        });
    }

    /**
     * Explicit final approval by Pengawas (only permitted when 100% forms are approved).
     */
    public function finalizeByPengawas(
        string $submissionId,
        ?string $catatan,
        User $pengawasUser
    ): PengajuanPenilaianRisiko {
        $submission = PengajuanPenilaianRisiko::with('items')->findOrFail($submissionId);
        $this->assertPengawasAuthorized($pengawasUser, $submission);

        if ($submission->current_tier !== PengajuanPenilaianRisiko::TIER_PENGAWAS) {
            throw ValidationException::withMessages([
                'status' => ['Pengajuan tidak berada pada tahap pengesahan Pengawas.'],
            ]);
        }

        return DB::transaction(function () use ($submission, $catatan, $pengawasUser) {
            $lockedSubmission = PengajuanPenilaianRisiko::lockForUpdate()->find($submission->id);
            if (! $lockedSubmission || $lockedSubmission->current_tier !== PengajuanPenilaianRisiko::TIER_PENGAWAS) {
                throw ValidationException::withMessages(['status' => ['Pengajuan tidak berada pada tahap pengesahan Pengawas.']]);
            }

            $allItems = $lockedSubmission->items()->get();
            $requiredItems = $allItems->whereIn('form_code', $this->registry->getCodes());

            $notReadyCount = $requiredItems->filter(function (PengajuanPenilaianRisikoItem $item) {
                return $item->current_tier !== PengajuanPenilaianRisiko::TIER_PENGAWAS
                    || $item->status_pengawas !== PengajuanPenilaianRisikoItem::STATUS_APPROVED;
            })->count();

            if ($requiredItems->isEmpty() || $notReadyCount > 0) {
                throw ValidationException::withMessages([
                    'status' => ['Seluruh formulir wajib disetujui Pengawas (100% hijau dan tidak ada yang sedang direvisi) sebelum disahkan final.'],
                ]);
            }

            $lockedSubmission->update([
                'status' => PengajuanPenilaianRisiko::STATUS_APPROVED,
                'current_tier' => PengajuanPenilaianRisiko::TIER_COMPLETED,
                'pengawas_id' => $pengawasUser->id,
                'pengawas_approved_at' => now(),
                'approved_by' => $pengawasUser->id,
                'approved_at' => now(),
            ]);

            foreach ($allItems as $item) {
                $item->update([
                    'current_tier' => PengajuanPenilaianRisiko::TIER_COMPLETED,
                    'status' => PengajuanPenilaianRisikoItem::STATUS_APPROVED,
                ]);
            }

            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $lockedSubmission->id,
                'action' => 'all_approved',
                'catatan' => $catatan ?: 'Seluruh formulir pengelolaan risiko telah disahkan final oleh Pengawas (Inspektorat).',
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
                    'catatan' => $catatan,
                ],
                auditableType: PengajuanPenilaianRisiko::class,
                auditableId: $lockedSubmission->id,
            );

            return $this->freshSubmission($lockedSubmission);
        });
    }

    protected function assertKepalaOpdAuthorized(User $user, PengajuanPenilaianRisiko $submission, string $message): void
    {
        $isAuthorized = $user->isRegionalAdmin()
            || ($user->isKepalaOpd()
                && $user->can('review_risiko.review_kepala')
                && (string) $user->opd_id === (string) $submission->opd_id);

        if (! $isAuthorized) {
            abort(403, $message);
        }
    }

    protected function assertAuditorAuthorized(User $user, PengajuanPenilaianRisiko $submission): void
    {
        if ($user->isRegionalAdmin()) {
            return;
        }

        if (! $user->isScopedAuditor() || ! $user->can('review_risiko.approve')) {
            abort(403, 'Hanya Evaluator yang ditugaskan atau Administrator yang berhak memeriksa tahap ini.');
        }

        $hasAssignment = AuditorOpdAssignment::where('auditor_id', $user->id)
            ->where('opd_id', $submission->opd_id)
            ->where('is_active', true)
            ->exists() || ((string) $submission->auditor_id === (string) $user->id);

        if (! $hasAssignment) {
            abort(403, 'Anda tidak memiliki hak akses untuk memeriksa perangkat daerah ini.');
        }
    }

    protected function assertPengawasAuthorized(User $user, PengajuanPenilaianRisiko $submission): void
    {
        if ($user->isRegionalAdmin()) {
            return;
        }

        $isAuthorized = $user->isScopedPengawas()
            && $user->can('review_risiko.review_pengawas');

        if (! $isAuthorized) {
            abort(403, 'Hanya Pengawas APIP (Koordinator Pengawas) atau Administrator yang berhak mengesahkan tingkat akhir.');
        }

        $ownsOpdAssignment = AuditorOpdAssignment::where('opd_id', $submission->opd_id)
            ->where('assigned_by', $user->id)
            ->where('is_active', true)
            ->exists();

        if (! $ownsOpdAssignment) {
            abort(403, 'Anda hanya dapat mengesahkan pengajuan dari OPD yang evaluatornya Anda tugaskan.');
        }
    }

    protected function freshSubmission(PengajuanPenilaianRisiko $submission): PengajuanPenilaianRisiko
    {
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
}
