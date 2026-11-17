<?php

declare(strict_types=1);

namespace App\Services\Pengawasan;

use App\Models\Opd;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuditorAssignmentService
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    /**
     * Get paginated assignments list.
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPaginatedAssignments(array $filters = [], int $perPage = 10, ?User $currentUser = null): LengthAwarePaginator
    {
        $query = AuditorOpdAssignment::with([
            'auditor:id,name,nip,email,jabatan,opd_id',
            'opd:id,kode,nama,kategori',
            'periodePenilaian:id,nama_periode,tahun_mulai,tahun_akhir',
            'assignedBy:id,name',
        ]);

        $this->applyFilters($query, $filters, $currentUser);

        return $query->orderBy('created_at', 'desc')->paginate($perPage);
    }

    /**
     * Get auditors with their assigned OPDs (grouped view for UI).
     *
     * @param  array<string, mixed>  $filters
     */
    public function getAuditorsWithAssignments(array $filters = [], int $perPage = 10, ?User $currentUser = null): LengthAwarePaginator
    {
        $isRegionalAdmin = $currentUser?->isRegionalAdmin() ?? false;
        $isEvaluator = $currentUser && $currentUser->hasRole(['Evaluator / Reviewer', 'Auditor']) && ! $currentUser->hasRole(['Superadmin', 'Administrator', 'Koordinator Pengawas', 'Admin Office', 'Inspektorat']);

        $query = User::with([
            'roles:id,name',
            'auditorAssignments' => function ($q) use ($currentUser, $isRegionalAdmin, $isEvaluator) {
                $q->with(['opd:id,kode,nama,kategori', 'periodePenilaian:id,nama_periode,tahun_mulai,tahun_akhir'])
                    ->when(! $isRegionalAdmin && ! $isEvaluator && $currentUser, function ($sq) use ($currentUser) {
                        $sq->where('assigned_by', $currentUser->id);
                    })
                    ->orderBy('created_at', 'desc');
            },
        ]);

        // If current user is an evaluator (and not an admin/koordinator), show only their own record
        if ($isEvaluator) {
            $query->where('id', $currentUser->id);
        } else {
            // Display evaluators (active users with role 'Evaluator / Reviewer' or 'Auditor')
            $query->whereHas('roles', function ($q) {
                $q->whereIn('name', ['Evaluator / Reviewer', 'Auditor']);
            })->where('status', 'active');

            // Scoping: Pengawas only sees unassigned evaluators OR evaluators assigned by themselves
            if (! $isRegionalAdmin && $currentUser) {
                $query->whereDoesntHave('auditorAssignments', function ($aq) use ($currentUser) {
                    $aq->where('is_active', true)
                        ->whereNotNull('assigned_by')
                        ->where('assigned_by', '!=', $currentUser->id);
                });
            }
        }

        if (! empty($filters['search'])) {
            $term = trim((string) $filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('nip', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%")
                    ->orWhereHas('auditorAssignments.opd', function ($oq) use ($term) {
                        $oq->where('nama', 'like', "%{$term}%")
                            ->orWhere('kode', 'like', "%{$term}%");
                    });
            });
        }

        if (! empty($filters['opd_id'])) {
            $query->whereHas('auditorAssignments', function ($q) use ($filters) {
                $q->where('opd_id', $filters['opd_id']);
            });
        }

        if (isset($filters['has_assignment'])) {
            if (filter_var($filters['has_assignment'], FILTER_VALIDATE_BOOLEAN)) {
                $query->has('auditorAssignments');
            } else {
                $query->doesntHave('auditorAssignments');
            }
        }

        return $query->orderBy('name', 'asc')->paginate($perPage);
    }

    /**
     * Get statistics on auditor coverage.
     *
     * @return array<string, int>
     */
    public function getStats(?string $periodePenilaianId = null, ?User $currentUser = null): array
    {
        $isRegionalAdmin = $currentUser?->isRegionalAdmin() ?? false;

        $globalAssignmentQuery = AuditorOpdAssignment::where('is_active', true);
        if ($periodePenilaianId) {
            $globalAssignmentQuery->where('periode_penilaian_id', $periodePenilaianId);
        }

        $scopedAssignmentQuery = clone $globalAssignmentQuery;
        if (! $isRegionalAdmin && $currentUser) {
            $scopedAssignmentQuery->where('assigned_by', $currentUser->id);
        }

        $totalAuditorBertugas = (clone $scopedAssignmentQuery)->distinct('auditor_id')->count('auditor_id');
        $totalOpdTercover = (clone $scopedAssignmentQuery)->distinct('opd_id')->count('opd_id');
        $totalPenugasanAktif = (clone $scopedAssignmentQuery)->count();

        $totalOpdAktif = Opd::where('is_active', true)->count();
        $globalOpdTercover = (clone $globalAssignmentQuery)->distinct('opd_id')->count('opd_id');
        $totalOpdBelumTercover = max(0, $totalOpdAktif - $globalOpdTercover);

        return [
            'total_auditor_bertugas' => $totalAuditorBertugas,
            'total_opd_tercover' => $totalOpdTercover,
            'total_opd_belum_tercover' => $totalOpdBelumTercover,
            'total_penugasan_aktif' => $totalPenugasanAktif,
            'total_opd_aktif' => $totalOpdAktif,
        ];
    }

    /**
     * Get list of eligible auditors for selection dropdown.
     *
     * @return Collection<int, User>
     */
    public function getEligibleAuditors(?User $currentUser = null): Collection
    {
        $isRegionalAdmin = $currentUser?->isRegionalAdmin() ?? false;
        $isEvaluator = $currentUser && $currentUser->hasRole(['Evaluator / Reviewer', 'Auditor']) && ! $currentUser->hasRole(['Superadmin', 'Administrator', 'Koordinator Pengawas', 'Admin Office', 'Inspektorat']);

        $query = User::whereHas('roles', function ($q) {
            $q->whereIn('name', ['Evaluator / Reviewer', 'Auditor']);
        })
            ->where('status', 'active');

        if (! $isRegionalAdmin && ! $isEvaluator && $currentUser) {
            $query->whereDoesntHave('auditorAssignments', function ($aq) use ($currentUser) {
                $aq->where('is_active', true)
                    ->whereNotNull('assigned_by')
                    ->where('assigned_by', '!=', $currentUser->id);
            });
        }

        return $query->with([
            'roles:id,name',
            'auditorAssignments' => function ($q) use ($currentUser, $isRegionalAdmin, $isEvaluator) {
                $q->select('id', 'auditor_id', 'opd_id', 'is_active', 'assigned_by')
                    ->when(! $isRegionalAdmin && ! $isEvaluator && $currentUser, function ($sq) use ($currentUser) {
                        $sq->where('assigned_by', $currentUser->id);
                    });
            },
        ])
            ->withCount(['auditorAssignments as active_opd_count' => function ($q) use ($currentUser, $isRegionalAdmin, $isEvaluator) {
                $q->where('is_active', true)
                    ->when(! $isRegionalAdmin && ! $isEvaluator && $currentUser, function ($sq) use ($currentUser) {
                        $sq->where('assigned_by', $currentUser->id);
                    });
            }])
            ->orderBy('name', 'asc')
            ->get(['id', 'name', 'nip', 'email', 'jabatan']);
    }

    /**
     * Assign an auditor to multiple OPDs.
     *
     * @param  array<string, mixed>  $data
     * @return array<int, AuditorOpdAssignment>
     */
    public function assignAuditor(array $data, ?User $assignedBy = null): array
    {
        $auditor = User::findOrFail($data['auditor_id']);
        $opdIds = (array) $data['opd_ids'];
        $isRegionalAdmin = $assignedBy?->isRegionalAdmin() ?? false;

        // Guard: check if this evaluator has active assignments by another pengawas
        if (! $isRegionalAdmin && $assignedBy) {
            $conflictPengawas = AuditorOpdAssignment::where('auditor_id', $auditor->id)
                ->where('is_active', true)
                ->whereNotNull('assigned_by')
                ->where('assigned_by', '!=', $assignedBy->id)
                ->with('assignedBy:id,name')
                ->first();

            if ($conflictPengawas) {
                $pengawasName = $conflictPengawas->assignedBy?->name ?? 'pengawas lain';
                throw ValidationException::withMessages([
                    'auditor_id' => ["Evaluator {$auditor->name} telah ditugaskan oleh {$pengawasName}. Anda tidak dapat menugaskan evaluator ini."],
                ]);
            }
        }

        return DB::transaction(function () use ($auditor, $opdIds, $data, $assignedBy, $isRegionalAdmin) {
            // Guard: 1 OPD can only be assigned to 1 auditor
            $conflict = AuditorOpdAssignment::whereIn('opd_id', $opdIds)
                ->where('auditor_id', '!=', $auditor->id)
                ->with(['opd:id,nama', 'auditor:id,name'])
                ->first();

            if ($conflict) {
                throw ValidationException::withMessages([
                    'opd_ids' => ["OPD \"{$conflict->opd?->nama}\" sudah ditugaskan kepada auditor {$conflict->auditor?->name}. Satu OPD hanya dapat ditugaskan ke 1 auditor."],
                ]);
            }

            // Sync: delete assignments for OPDs no longer in the list for this auditor
            $deleteQuery = AuditorOpdAssignment::where('auditor_id', $auditor->id)
                ->whereNotIn('opd_id', $opdIds);

            if (! $isRegionalAdmin && $assignedBy) {
                $deleteQuery->where(function ($q) use ($assignedBy) {
                    $q->whereNull('assigned_by')
                        ->orWhere('assigned_by', $assignedBy->id);
                });
            }

            $deleteQuery->get()->each(fn ($obs) => $obs->delete());

            $createdAssignments = [];

            foreach ($opdIds as $opdId) {
                $assignment = AuditorOpdAssignment::updateOrCreate(
                    [
                        'opd_id' => $opdId,
                    ],
                    [
                        'auditor_id' => $auditor->id,
                        'periode_penilaian_id' => $data['periode_penilaian_id'] ?? null,
                        'assigned_by' => $assignedBy?->id,
                        'nomor_surat_tugas' => $data['nomor_surat_tugas'] ?? null,
                        'tanggal_mulai' => $data['tanggal_mulai'] ?? null,
                        'tanggal_selesai' => $data['tanggal_selesai'] ?? null,
                        'catatan' => $data['catatan'] ?? null,
                        'is_active' => $data['is_active'] ?? true,
                    ]
                );

                $createdAssignments[] = $assignment->load(['opd:id,kode,nama,kategori']);
            }

            return $createdAssignments;
        });
    }

    /**
     * Update/sync all assigned OPDs for a specific auditor.
     *
     * @param  array<string, mixed>  $data
     * @return array<int, AuditorOpdAssignment>
     */
    public function syncAuditorAssignments(string $auditorId, array $data, ?User $assignedBy = null): array
    {
        $auditor = User::findOrFail($auditorId);
        $newOpdIds = (array) $data['opd_ids'];
        $isRegionalAdmin = $assignedBy?->isRegionalAdmin() ?? false;

        // Guard: check if this evaluator has active assignments by another pengawas
        if (! $isRegionalAdmin && $assignedBy) {
            $conflictPengawas = AuditorOpdAssignment::where('auditor_id', $auditor->id)
                ->where('is_active', true)
                ->whereNotNull('assigned_by')
                ->where('assigned_by', '!=', $assignedBy->id)
                ->with('assignedBy:id,name')
                ->first();

            if ($conflictPengawas) {
                $pengawasName = $conflictPengawas->assignedBy?->name ?? 'pengawas lain';
                throw ValidationException::withMessages([
                    'auditor_id' => ["Evaluator {$auditor->name} telah ditugaskan oleh {$pengawasName}. Anda tidak dapat menugaskan evaluator ini."],
                ]);
            }
        }

        return DB::transaction(function () use ($auditor, $newOpdIds, $data, $assignedBy, $isRegionalAdmin) {
            // Guard: 1 OPD can only be assigned to 1 auditor
            $conflict = AuditorOpdAssignment::whereIn('opd_id', $newOpdIds)
                ->where('auditor_id', '!=', $auditor->id)
                ->with(['opd:id,nama', 'auditor:id,name'])
                ->first();

            if ($conflict) {
                throw ValidationException::withMessages([
                    'opd_ids' => ["OPD \"{$conflict->opd?->nama}\" sudah ditugaskan kepada auditor {$conflict->auditor?->name}. Satu OPD hanya dapat ditugaskan ke 1 auditor."],
                ]);
            }

            // 1. Delete assignments for OPDs no longer in the list
            $obsoleteQuery = AuditorOpdAssignment::where('auditor_id', $auditor->id)
                ->whereNotIn('opd_id', $newOpdIds);

            if (! $isRegionalAdmin && $assignedBy) {
                $obsoleteQuery->where(function ($q) use ($assignedBy) {
                    $q->whereNull('assigned_by')
                        ->orWhere('assigned_by', $assignedBy->id);
                });
            }

            $obsoleteAssignments = $obsoleteQuery->get();

            foreach ($obsoleteAssignments as $obs) {
                $obs->delete(); // Triggers Auditable event
            }

            // 2. Create or update remaining / new OPD assignments
            $synced = [];
            foreach ($newOpdIds as $opdId) {
                $assignment = AuditorOpdAssignment::updateOrCreate(
                    [
                        'opd_id' => $opdId,
                    ],
                    [
                        'auditor_id' => $auditor->id,
                        'periode_penilaian_id' => $data['periode_penilaian_id'] ?? null,
                        'assigned_by' => $assignedBy?->id,
                        'nomor_surat_tugas' => $data['nomor_surat_tugas'] ?? null,
                        'tanggal_mulai' => $data['tanggal_mulai'] ?? null,
                        'tanggal_selesai' => $data['tanggal_selesai'] ?? null,
                        'catatan' => $data['catatan'] ?? null,
                        'is_active' => $data['is_active'] ?? true,
                    ]
                );

                $synced[] = $assignment->load(['opd:id,kode,nama,kategori']);
            }

            return $synced;
        });
    }

    /**
     * Delete a single assignment by assignment ID.
     */
    public function deleteAssignment(string $id, ?User $currentUser = null): bool
    {
        $assignment = AuditorOpdAssignment::findOrFail($id);

        $isRegionalAdmin = $currentUser?->isRegionalAdmin() ?? false;
        if (! $isRegionalAdmin && $currentUser && $assignment->assigned_by && $assignment->assigned_by !== $currentUser->id) {
            abort(403, 'Anda tidak memiliki hak untuk menghapus penugasan yang dibuat oleh pengawas lain.');
        }

        return (bool) $assignment->delete();
    }

    /**
     * Delete all assignments for an auditor.
     */
    public function deleteAuditorAssignments(string $auditorId, ?User $currentUser = null): int
    {
        $isRegionalAdmin = $currentUser?->isRegionalAdmin() ?? false;

        $query = AuditorOpdAssignment::where('auditor_id', $auditorId);
        if (! $isRegionalAdmin && $currentUser) {
            $otherAssignment = (clone $query)->whereNotNull('assigned_by')
                ->where('assigned_by', '!=', $currentUser->id)
                ->first();

            if ($otherAssignment) {
                abort(403, 'Anda tidak memiliki hak untuk mencabut penugasan evaluator yang ditugaskan oleh pengawas lain.');
            }

            $query->where(function ($q) use ($currentUser) {
                $q->whereNull('assigned_by')
                    ->orWhere('assigned_by', $currentUser->id);
            });
        }

        $assignments = $query->get();
        $count = 0;
        foreach ($assignments as $assignment) {
            $assignment->delete();
            $count++;
        }

        return $count;
    }

    /**
     * Helper to apply common filters.
     */
    protected function applyFilters($query, array $filters, ?User $currentUser): void
    {
        $isRegionalAdmin = $currentUser?->isRegionalAdmin() ?? false;
        $isEvaluator = $currentUser && $currentUser->hasRole(['Evaluator / Reviewer', 'Auditor']) && ! $currentUser->hasRole(['Superadmin', 'Administrator', 'Koordinator Pengawas', 'Admin Office', 'Inspektorat']);

        if ($isEvaluator) {
            $query->where('auditor_id', $currentUser->id);
        } elseif (! $isRegionalAdmin && $currentUser) {
            $query->where('assigned_by', $currentUser->id);
        } elseif (! empty($filters['auditor_id'])) {
            $query->where('auditor_id', $filters['auditor_id']);
        }

        if (! empty($filters['opd_id'])) {
            $query->where('opd_id', $filters['opd_id']);
        }

        if (! empty($filters['periode_penilaian_id'])) {
            $query->where('periode_penilaian_id', $filters['periode_penilaian_id']);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        if (! empty($filters['search'])) {
            $term = trim((string) $filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('nomor_surat_tugas', 'like', "%{$term}%")
                    ->orWhereHas('auditor', function ($aq) use ($term) {
                        $aq->where('name', 'like', "%{$term}%")
                            ->orWhere('nip', 'like', "%{$term}%");
                    })
                    ->orWhereHas('opd', function ($oq) use ($term) {
                        $oq->where('nama', 'like', "%{$term}%")
                            ->orWhere('kode', 'like', "%{$term}%");
                    });
            });
        }
    }
}
