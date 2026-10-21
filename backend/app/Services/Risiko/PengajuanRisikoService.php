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
            return $periodeId;
        }

        $active = PeriodePenilaian::where('status', 'aktif')->first();
        if (!$active) {
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
            ->first();

        $submission = PengajuanPenilaianRisiko::firstOrCreate(
            [
                'opd_id' => $opdId,
                'periode_penilaian_id' => $resolvedPeriodeId,
            ],
            [
                'auditor_id' => $assignment?->auditor_id,
                'status' => PengajuanPenilaianRisiko::STATUS_DRAFT,
            ]
        );

        // If auditor assignment updated and submission has no auditor, sync it
        if ($assignment && $submission->auditor_id !== $assignment->auditor_id && !$submission->isApproved()) {
            $submission->update(['auditor_id' => $assignment->auditor_id]);
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
    public function checkReadiness(string $opdId, ?string $periodeId = null): array
    {
        $resolvedPeriodeId = $this->resolvePeriodeId($periodeId);
        $submission = $this->getOrCreateSubmission($opdId, $resolvedPeriodeId);

        // 1. Check Auditor Assignment
        $assignment = AuditorOpdAssignment::where('opd_id', $opdId)
            ->where('is_active', true)
            ->with(['auditor:id,name,nip,email,jabatan'])
            ->first();

        $hasAuditor = $assignment !== null;

        // 2. Check Form 2B (Konteks Strategis)
        $konteks2b = KonteksPenilaian::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->with(['sasarans', 'indikators'])
            ->first();

        $is2bComplete = (bool) (
            $konteks2b &&
            !empty($konteks2b->sumber_data_id) &&
            !empty($konteks2b->tujuan_penilaian_id) &&
            $konteks2b->sasarans->isNotEmpty() &&
            $konteks2b->indikators->isNotEmpty()
        );

        // 3. Check Form 2C (Konteks Operasional)
        $operasional = KonteksOperasional::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->withCount(['items as programs_count' => fn ($q) => $q->where('jenis', 'program')])
            ->first();

        $is2cComplete = (bool) ($operasional && $operasional->programs_count > 0);

        // List missing forms
        $missingForms = [];
        if (!$is2bComplete) {
            $missingForms[] = [
                'code' => '2B',
                'name' => 'Konteks Strategis (Form 2B)',
                'description' => 'Tujuan, sasaran, dan indikator strategis OPD belum terisi lengkap.',
            ];
        }
        if (!$is2cComplete) {
            $missingForms[] = [
                'code' => '2C',
                'name' => 'Konteks Operasional (Form 2C)',
                'description' => 'Pohon kinerja program/kegiatan operasional belum ditambahkan.',
            ];
        }

        $allFormsComplete = $is2bComplete && $is2cComplete;
        $isReadyToSubmit = $hasAuditor && $allFormsComplete && in_array($submission->status, [
            PengajuanPenilaianRisiko::STATUS_DRAFT,
            PengajuanPenilaianRisiko::STATUS_REVISION_REQUESTED,
        ], true);

        return [
            'submission' => $submission,
            'has_auditor' => $hasAuditor,
            'assigned_auditor' => $assignment?->auditor,
            'is_2b_complete' => $is2bComplete,
            'is_2c_complete' => $is2cComplete,
            'all_forms_complete' => $allFormsComplete,
            'missing_forms' => $missingForms,
            'is_ready_to_submit' => $isReadyToSubmit,
            'is_locked' => $submission->isLockedForOpd(),
            'status' => $submission->status,
        ];
    }

    /**
     * Submit risk management forms to assigned auditor for review.
     */
    public function submitForReview(string $opdId, ?string $periodeId, User $user, ?string $catatan = null): PengajuanPenilaianRisiko
    {
        $resolvedPeriodeId = $this->resolvePeriodeId($periodeId);
        $readiness = $this->checkReadiness($opdId, $resolvedPeriodeId);

        if (!$readiness['has_auditor']) {
            throw ValidationException::withMessages([
                'auditor' => ['OPD Anda belum memiliki Auditor Pengawas yang ditugaskan oleh Inspektorat. Pengajuan tidak dapat dilakukan.'],
            ]);
        }

        if (!$readiness['all_forms_complete']) {
            $missingNames = array_column($readiness['missing_forms'], 'name');
            throw ValidationException::withMessages([
                'forms' => ['Seluruh lembar kerja (' . implode(', ', $missingNames) . ') wajib dilengkapi terlebih dahulu sebelum dikirimkan ke Auditor.'],
            ]);
        }

        /** @var PengajuanPenilaianRisiko $submission */
        $submission = $readiness['submission'];

        if ($submission->isLockedForOpd()) {
            throw ValidationException::withMessages([
                'status' => ['Lembar kerja risiko Anda sedang dalam proses pemeriksaan oleh auditor atau telah disetujui (read-only).'],
            ]);
        }

        return DB::transaction(function () use ($submission, $readiness, $user, $catatan) {
            $submission->update([
                'auditor_id' => $readiness['assigned_auditor']->id,
                'status' => PengajuanPenilaianRisiko::STATUS_SUBMITTED,
                'submitted_at' => now(),
                'submitted_by' => $user->id,
            ]);

            // Set all draft or rejected items to submitted
            foreach ($submission->items as $item) {
                if ($item->status !== PengajuanPenilaianRisikoItem::STATUS_APPROVED) {
                    $item->update([
                        'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                    ]);
                }
            }

            // Record in timeline history
            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $submission->id,
                'action' => 'submitted',
                'catatan' => $catatan ?: 'Lembar kerja risiko lengkap dikirimkan oleh OPD untuk ditinjau auditor.',
                'user_id' => $user->id,
                'created_at' => now(),
            ]);

            return $submission->fresh([
                'opd',
                'periodePenilaian',
                'auditor',
                'items.reviewedBy',
                'histories.user',
            ]);
        });
    }

    /**
     * Get list of OPD risk submissions for an auditor or inspectorate.
     *
     * @param array<string, mixed> $filters
     */
    public function getAuditorReviewList(User $user, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $resolvedPeriodeId = $this->resolvePeriodeId($filters['periode_penilaian_id'] ?? null);

        $query = Opd::query()->where('is_active', true);

        // Scope to auditor's assigned OPDs if role is Auditor (and not Superadmin / Inspektorat)
        $isSpecialAdmin = $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat']);
        if (!$isSpecialAdmin && $user->hasRole('Auditor')) {
            $assignedOpdIds = AuditorOpdAssignment::where('auditor_id', $user->id)
                ->where('is_active', true)
                ->pluck('opd_id');

            $query->whereIn('id', $assignedOpdIds);
        }

        if (!empty($filters['search'])) {
            $term = trim((string) $filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('nama', 'like', "%{$term}%")
                    ->orWhere('kode', 'like', "%{$term}%");
            });
        }

        if (!empty($filters['auditor_id'])) {
            $query->whereHas('auditorAssignments', function ($q) use ($filters) {
                $q->where('auditor_id', $filters['auditor_id'])->where('is_active', true);
            });
        }

        // Filter by submission status
        if (!empty($filters['status'])) {
            $status = $filters['status'];
            if ($status === 'belum_mengirim') {
                $query->where(function ($q) use ($resolvedPeriodeId) {
                    $q->whereDoesntHave('pengajuanRisiko', function ($sq) use ($resolvedPeriodeId) {
                        $sq->where('periode_penilaian_id', $resolvedPeriodeId);
                    })->orWhereHas('pengajuanRisiko', function ($sq) use ($resolvedPeriodeId) {
                        $sq->where('periode_penilaian_id', $resolvedPeriodeId)
                            ->where('status', PengajuanPenilaianRisiko::STATUS_DRAFT);
                    });
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
            'pengajuanRisiko' => fn ($q) => $q->where('periode_penilaian_id', $resolvedPeriodeId)->with(['items']),
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
            'periodePenilaian:id,nama,tahun_mulai,tahun_selesai',
            'auditor:id,name,nip,email,jabatan',
            'submittedBy:id,name',
            'approvedBy:id,name',
            'items.reviewedBy:id,name',
            'histories.user:id,name',
        ])->findOrFail($submissionId);

        // Authorization check: If user is Auditor, verify assignment
        $isSpecialAdmin = $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat']);
        if (!$isSpecialAdmin && $user->hasRole('Auditor')) {
            $hasAssignment = AuditorOpdAssignment::where('auditor_id', $user->id)
                ->where('opd_id', $submission->opd_id)
                ->where('is_active', true)
                ->exists();

            if (!$hasAssignment) {
                abort(403, 'Anda tidak ditugaskan sebagai auditor pengawas untuk perangkat daerah ini.');
            }
        }

        // If status is submitted, auto-transition to in_review on auditor open
        if ($submission->isSubmitted() && $user->hasRole(['Auditor', 'Inspektorat', 'Superadmin'])) {
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
            'items.reviewedBy',
            'histories.user',
        ]);
    }

    /**
     * Review a specific form item (Approve or Reject with mandatory revision notes).
     */
    public function reviewItem(
        string $submissionId,
        string $formCode,
        string $status,
        ?string $catatanRevisi,
        User $auditorUser
    ): PengajuanPenilaianRisikoItem {
        if (!in_array($status, [PengajuanPenilaianRisikoItem::STATUS_APPROVED, PengajuanPenilaianRisikoItem::STATUS_REJECTED], true)) {
            throw ValidationException::withMessages([
                'status' => ['Status review harus disetujui (approved) atau ditolak (rejected).'],
            ]);
        }

        if ($status === PengajuanPenilaianRisikoItem::STATUS_REJECTED) {
            $trimmed = trim((string) $catatanRevisi);
            if (strlen($trimmed) < 5) {
                throw ValidationException::withMessages([
                    'catatan_revisi' => ['Catatan revisi wajib diisi minimal 5 karakter jika lembar kerja ditolak.'],
                ]);
            }
        }

        $submission = PengajuanPenilaianRisiko::with('items')->findOrFail($submissionId);

        // Authorization check
        $isSpecialAdmin = $auditorUser->hasRole(['Superadmin', 'Admin Office', 'Inspektorat']);
        if (!$isSpecialAdmin && $auditorUser->hasRole('Auditor')) {
            $hasAssignment = AuditorOpdAssignment::where('auditor_id', $auditorUser->id)
                ->where('opd_id', $submission->opd_id)
                ->where('is_active', true)
                ->exists();

            if (!$hasAssignment) {
                abort(403, 'Anda tidak memiliki hak akses untuk memeriksa perangkat daerah ini.');
            }
        }

        return DB::transaction(function () use ($submission, $formCode, $status, $catatanRevisi, $auditorUser) {
            $item = PengajuanPenilaianRisikoItem::firstOrCreate(
                [
                    'pengajuan_id' => $submission->id,
                    'form_code' => $formCode,
                ],
                [
                    'status' => PengajuanPenilaianRisikoItem::STATUS_SUBMITTED,
                ]
            );

            $item->update([
                'status' => $status,
                'catatan_revisi' => $status === PengajuanPenilaianRisikoItem::STATUS_REJECTED ? $catatanRevisi : null,
                'reviewed_at' => now(),
                'reviewed_by' => $auditorUser->id,
            ]);

            // Add history entry
            PengajuanPenilaianRisikoHistory::create([
                'pengajuan_id' => $submission->id,
                'form_code' => $formCode,
                'action' => $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED ? 'approved_item' : 'rejected_item',
                'catatan' => $status === PengajuanPenilaianRisikoItem::STATUS_APPROVED
                    ? "Form {$formCode} disetujui oleh auditor."
                    : "Form {$formCode} ditolak / perlu revisi: {$catatanRevisi}",
                'user_id' => $auditorUser->id,
                'created_at' => now(),
            ]);

            // Re-evaluate parent submission status
            $allItems = PengajuanPenilaianRisikoItem::where('pengajuan_id', $submission->id)->get();
            $hasAnyRejected = $allItems->contains('status', PengajuanPenilaianRisikoItem::STATUS_REJECTED);
            
            // Check if all required items are approved
            $approvedCount = $allItems->whereIn('form_code', self::REQUIRED_FORM_CODES)
                ->where('status', PengajuanPenilaianRisikoItem::STATUS_APPROVED)
                ->count();

            $allRequiredApproved = $approvedCount === count(self::REQUIRED_FORM_CODES);

            if ($hasAnyRejected) {
                $submission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_REVISION_REQUESTED,
                ]);
            } elseif ($allRequiredApproved) {
                $submission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_APPROVED,
                    'approved_at' => now(),
                    'approved_by' => $auditorUser->id,
                ]);

                PengajuanPenilaianRisikoHistory::create([
                    'pengajuan_id' => $submission->id,
                    'action' => 'all_approved',
                    'catatan' => 'Seluruh lembar kerja pengelolaan risiko telah disetujui auditor.',
                    'user_id' => $auditorUser->id,
                    'created_at' => now(),
                ]);
            } else {
                $submission->update([
                    'status' => PengajuanPenilaianRisiko::STATUS_IN_REVIEW,
                ]);
            }

            return $item->fresh(['reviewedBy:id,name']);
        });
    }

    /**
     * Check if a given OPD can edit their forms in the specified period.
     * Throws 403 / ValidationException if not allowed.
     */
    public function assertOpdCanEdit(string $opdId, ?string $periodeId = null, ?User $user = null): void
    {
        // Superadmin and Admin Office can bypass
        if ($user && $user->hasRole(['Superadmin', 'Admin Office'])) {
            return;
        }

        $resolvedPeriodeId = $this->resolvePeriodeId($periodeId);

        // 1. Check if OPD has an assigned auditor
        $hasAuditor = AuditorOpdAssignment::where('opd_id', $opdId)
            ->where('is_active', true)
            ->exists();

        if (!$hasAuditor) {
            abort(403, 'Perangkat Daerah (OPD) Anda belum memiliki Auditor Pengawas yang ditugaskan oleh Inspektorat. Pengisian atau pengubahan lembar kerja belum dapat dilakukan.');
        }

        // 2. Check submission status lock
        $submission = PengajuanPenilaianRisiko::where('opd_id', $opdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->first();

        if ($submission && $submission->isLockedForOpd()) {
            abort(403, 'Lembar kerja risiko Anda sedang dalam proses pemeriksaan oleh auditor atau telah disetujui (read-only).');
        }
    }
}
