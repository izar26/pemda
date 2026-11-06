<?php

namespace App\Services\Risiko\Pengajuan;

use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\Risiko\PengajuanPenilaianRisikoHistory;
use App\Models\Risiko\PengajuanPenilaianRisikoItem;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

class PengajuanQueryService
{
    public const REQUIRED_FORM_CODES = ['2b', '2c'];

    /**
     * Resolve active evaluation period ID if null.
     */
    public function resolvePeriodeId(?string $periodeId = null): string
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
     * Get real-time pending approval counts and actionable items for current user.
     *
     * @return array<string, mixed>
     */
    public function getPendingCounts(User $user, ?string $periodeId = null): array
    {
        $resolvedPeriodeId = $this->resolvePeriodeId($periodeId);

        $isSuperadmin = $user->hasRole(['Superadmin', 'Admin Office']);
        $isExecutive = $user->hasRole('Executive');
        $isAuditor = $user->hasRole('Auditor');
        $isPengawas = $user->hasRole('Inspektorat');
        $isOpd = $user->hasRole('OPD');

        $kepalaOpdPending = 0;
        $auditorPending = 0;
        $pengawasPending = 0;
        $operatorActionRequired = false;
        $myPendingTotal = 0;
        $pendingItems = [];

        // 1. Kepala OPD pending logic
        if ($isSuperadmin || ($isExecutive && $user->opd_id)) {
            $query = PengajuanPenilaianRisiko::where('periode_penilaian_id', $resolvedPeriodeId)
                ->where('current_tier', PengajuanPenilaianRisiko::TIER_KEPALA_OPD)
                ->whereIn('status', [
                    PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_KEPALA,
                    PengajuanPenilaianRisiko::STATUS_REVISION_BY_AUDITOR,
                ]);

            if ($user->opd_id && ! $isSuperadmin) {
                $query->where('opd_id', $user->opd_id);
            }

            $kepalaOpdPending = $query->count();

            if ($isExecutive && $user->opd_id) {
                $myPendingTotal += $kepalaOpdPending;
                $items = (clone $query)->with('opd:id,nama,kode')->limit(5)->get();
                foreach ($items as $item) {
                    $pendingItems[] = [
                        'id' => $item->id,
                        'opd_id' => $item->opd_id,
                        'opd_nama' => $item->opd?->nama ?? 'Perangkat Daerah',
                        'opd_kode' => $item->opd?->kode ?? '',
                        'status' => $item->status,
                        'tier' => $item->current_tier,
                        'submitted_at' => $item->submitted_at?->toISOString(),
                        'action_type' => $item->status === PengajuanPenilaianRisiko::STATUS_REVISION_BY_AUDITOR ? 'delegate_revision' : 'review_internal',
                        'title' => $item->status === PengajuanPenilaianRisiko::STATUS_REVISION_BY_AUDITOR ? 'Delegasikan Revisi Auditor' : 'Persetujuan Internal OPD',
                        'url' => '/pengawasan/review-risiko',
                    ];
                }
            }
        } elseif ($isExecutive && ! $user->opd_id) {
            $kepalaOpdPending = PengajuanPenilaianRisiko::where('periode_penilaian_id', $resolvedPeriodeId)
                ->where('current_tier', PengajuanPenilaianRisiko::TIER_KEPALA_OPD)
                ->count();
        }

        // 2. Auditor pending logic
        if ($isSuperadmin || $isAuditor || $isPengawas) {
            $auditorQuery = PengajuanPenilaianRisiko::where('periode_penilaian_id', $resolvedPeriodeId)
                ->where('current_tier', PengajuanPenilaianRisiko::TIER_AUDITOR)
                ->whereIn('status', [
                    PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_AUDITOR,
                    PengajuanPenilaianRisiko::STATUS_IN_REVIEW_AUDITOR,
                    PengajuanPenilaianRisiko::STATUS_SUBMITTED,
                    PengajuanPenilaianRisiko::STATUS_IN_REVIEW,
                    PengajuanPenilaianRisiko::STATUS_REVISION_BY_PENGAWAS,
                ]);

            if ($isAuditor && ! $isSuperadmin && ! $isPengawas) {
                $assignedOpds = $user->activeAssignedOpdIds();
                $auditorQuery->whereIn('opd_id', $assignedOpds);
            }

            $auditorPending = $auditorQuery->count();

            if ($isAuditor && ! $isPengawas && ! $isSuperadmin) {
                $myPendingTotal += $auditorPending;
                $items = (clone $auditorQuery)->with('opd:id,nama,kode')->limit(5)->get();
                foreach ($items as $item) {
                    $pendingItems[] = [
                        'id' => $item->id,
                        'opd_id' => $item->opd_id,
                        'opd_nama' => $item->opd?->nama ?? 'Perangkat Daerah',
                        'opd_kode' => $item->opd?->kode ?? '',
                        'status' => $item->status,
                        'tier' => $item->current_tier,
                        'submitted_at' => $item->submitted_at?->toISOString(),
                        'action_type' => $item->status === PengajuanPenilaianRisiko::STATUS_REVISION_BY_PENGAWAS ? 'auditor_resolve_rejection' : 'auditor_review',
                        'title' => $item->status === PengajuanPenilaianRisiko::STATUS_REVISION_BY_PENGAWAS ? 'Tindak Lanjut Revisi Pengawas' : 'Pemeriksaan Risiko OPD',
                        'url' => '/pengawasan/review-risiko',
                    ];
                }
            }
        }

        // 3. Pengawas (Inspektorat) pending logic
        if ($isSuperadmin || $isPengawas) {
            $pengawasQuery = PengajuanPenilaianRisiko::where('periode_penilaian_id', $resolvedPeriodeId)
                ->where('current_tier', PengajuanPenilaianRisiko::TIER_PENGAWAS)
                ->whereIn('status', [
                    PengajuanPenilaianRisiko::STATUS_SUBMITTED_TO_PENGAWAS,
                    PengajuanPenilaianRisiko::STATUS_IN_REVIEW_PENGAWAS,
                ]);

            $pengawasPending = $pengawasQuery->count();

            if ($isPengawas && ! $isSuperadmin) {
                $myPendingTotal += $pengawasPending;
                $items = (clone $pengawasQuery)->with('opd:id,nama,kode')->limit(5)->get();
                foreach ($items as $item) {
                    $pendingItems[] = [
                        'id' => $item->id,
                        'opd_id' => $item->opd_id,
                        'opd_nama' => $item->opd?->nama ?? 'Perangkat Daerah',
                        'opd_kode' => $item->opd?->kode ?? '',
                        'status' => $item->status,
                        'tier' => $item->current_tier,
                        'submitted_at' => $item->submitted_at?->toISOString(),
                        'action_type' => 'pengawas_approval',
                        'title' => 'Pengesahan Akhir Pengawas APIP',
                        'url' => '/pengawasan/review-risiko',
                    ];
                }
            }
        }

        // 4. Operator (OPD) action required logic
        if ($isOpd && $user->opd_id) {
            $opdSubmission = PengajuanPenilaianRisiko::where('periode_penilaian_id', $resolvedPeriodeId)
                ->where('opd_id', $user->opd_id)
                ->first();

            if ($opdSubmission && in_array($opdSubmission->status, [
                PengajuanPenilaianRisiko::STATUS_REVISION_TO_OPERATOR,
                PengajuanPenilaianRisiko::STATUS_REVISION_BY_KEPALA,
            ], true)) {
                $operatorActionRequired = true;
                $myPendingTotal = 1;
                $pendingItems[] = [
                    'id' => $opdSubmission->id,
                    'opd_id' => $opdSubmission->opd_id,
                    'opd_nama' => $user->opd?->nama ?? 'Perangkat Daerah Saya',
                    'opd_kode' => $user->opd?->kode ?? '',
                    'status' => $opdSubmission->status,
                    'tier' => $opdSubmission->current_tier,
                    'submitted_at' => $opdSubmission->submitted_at?->toISOString(),
                    'action_type' => 'operator_revision',
                    'title' => 'Perbaikan Lembar Kerja Risiko',
                    'url' => '/risiko/konteks-strategis',
                ];
            }
        }

        if ($isSuperadmin) {
            $myPendingTotal = $kepalaOpdPending + $auditorPending + $pengawasPending;
        }

        return [
            'kepala_opd_pending' => $kepalaOpdPending,
            'auditor_pending' => $auditorPending,
            'pengawas_pending' => $pengawasPending,
            'operator_action_required' => $operatorActionRequired,
            'my_pending_total' => $myPendingTotal,
            'pending_items' => $pendingItems,
        ];
    }
}
