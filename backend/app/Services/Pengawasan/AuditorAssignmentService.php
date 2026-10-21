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
            'periodePenilaian:id,nama,tahun_mulai,tahun_selesai',
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
        $query = User::with([
            'roles:id,name',
            'auditorAssignments' => function ($q) {
                $q->with(['opd:id,kode,nama,kategori', 'periodePenilaian:id,nama,tahun_mulai,tahun_selesai'])
                    ->orderBy('created_at', 'desc');
            },
        ]);

        // Only display auditors who currently have OPD assignments
        if ($currentUser && $currentUser->hasRole('Auditor') && !$currentUser->hasRole(['Superadmin', 'Admin Office', 'Inspektorat'])) {
            $query->where('id', $currentUser->id)->has('auditorAssignments');
        } else {
            $query->has('auditorAssignments');
        }

        if (!empty($filters['search'])) {
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

        if (!empty($filters['opd_id'])) {
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
    public function getStats(?string $periodePenilaianId = null): array
    {
        $assignmentQuery = AuditorOpdAssignment::where('is_active', true);
        if ($periodePenilaianId) {
            $assignmentQuery->where('periode_penilaian_id', $periodePenilaianId);
        }

        $totalAuditorBertugas = (clone $assignmentQuery)->distinct('auditor_id')->count('auditor_id');
        $totalOpdTercover = (clone $assignmentQuery)->distinct('opd_id')->count('opd_id');
        $totalPenugasanAktif = (clone $assignmentQuery)->count();

        $totalOpdAktif = Opd::where('is_active', true)->count();
        $totalOpdBelumTercover = max(0, $totalOpdAktif - $totalOpdTercover);

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
    public function getEligibleAuditors(): Collection
    {
        return User::whereHas('roles', function ($q) {
            $q->whereIn('name', ['Auditor', 'Inspektorat']);
        })
            ->where('status', 'active')
            ->with([
                'roles:id,name',
                'auditorAssignments' => function ($q) {
                    $q->select('id', 'auditor_id', 'opd_id', 'is_active');
                },
            ])
            ->withCount(['auditorAssignments as active_opd_count' => function ($q) {
                $q->where('is_active', true);
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

        return DB::transaction(function () use ($auditor, $opdIds, $data, $assignedBy) {
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
            AuditorOpdAssignment::where('auditor_id', $auditor->id)
                ->whereNotIn('opd_id', $opdIds)
                ->get()
                ->each(fn ($obs) => $obs->delete());

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

        return DB::transaction(function () use ($auditor, $newOpdIds, $data, $assignedBy) {
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
            $obsoleteAssignments = AuditorOpdAssignment::where('auditor_id', $auditor->id)
                ->whereNotIn('opd_id', $newOpdIds)
                ->get();

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
    public function deleteAssignment(string $id): bool
    {
        $assignment = AuditorOpdAssignment::findOrFail($id);
        return (bool) $assignment->delete();
    }

    /**
     * Delete all assignments for an auditor.
     */
    public function deleteAuditorAssignments(string $auditorId): int
    {
        $assignments = AuditorOpdAssignment::where('auditor_id', $auditorId)->get();
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
        if ($currentUser && $currentUser->hasRole('Auditor') && !$currentUser->hasRole(['Superadmin', 'Admin Office', 'Inspektorat'])) {
            $query->where('auditor_id', $currentUser->id);
        } elseif (!empty($filters['auditor_id'])) {
            $query->where('auditor_id', $filters['auditor_id']);
        }

        if (!empty($filters['opd_id'])) {
            $query->where('opd_id', $filters['opd_id']);
        }

        if (!empty($filters['periode_penilaian_id'])) {
            $query->where('periode_penilaian_id', $filters['periode_penilaian_id']);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['search'])) {
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
