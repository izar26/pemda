<?php

declare(strict_types=1);

namespace App\Services\Pegawai;

use App\Models\Opd;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PegawaiService
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    /**
     * Get paginated and filtered list of employees (Pegawai).
     *
     * @param  array<string, mixed>  $filters
     */
    public function getPegawai(array $filters = [], int $perPage = 10, ?User $currentUser = null): LengthAwarePaginator
    {
        $user = $currentUser ?? auth('sanctum')->user() ?? auth()->user();

        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat'])) {
            $filters['opd_id'] = (string) $user->opd_id;
        }

        $query = User::with(['roles', 'opd']);

        // Ghost filter: non-superadmin users must not see Superadmin accounts
        if (!$user?->hasRole('Superadmin')) {
            $query->whereDoesntHave('roles', function ($q) {
                $q->where('name', 'Superadmin');
            })->where(function ($q) {
                $q->whereNull('role')->orWhere('role', '!=', 'Superadmin');
            });
        }

        // Search by name, email, nip, phone, jabatan, or pangkat
        if (!empty($filters['search'])) {
            $term = trim((string) $filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%")
                    ->orWhere('nip', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%")
                    ->orWhere('jabatan', 'like', "%{$term}%")
                    ->orWhere('pangkat_gol', 'like', "%{$term}%");
            });
        }

        // Filter by OPD (Instansi)
        if (!empty($filters['opd_id'])) {
            $query->where('opd_id', $filters['opd_id']);
        }

        // Filter by Jabatan ('Kepala OPD' or 'Pegawai')
        if (!empty($filters['jabatan'])) {
            $query->where('jabatan', (string) $filters['jabatan']);
        }

        // Filter by whether employee already has a login account
        if (isset($filters['has_account']) && $filters['has_account'] !== '') {
            $hasAccount = filter_var($filters['has_account'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($hasAccount === true) {
                $query->whereNotNull('password');
            } elseif ($hasAccount === false) {
                $query->whereNull('password');
            }
        }

        // Sorting: Kepala OPD prioritized when sorting by jabatan, otherwise standard column sort
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDirection = strtolower($filters['sort_direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        $allowedSortColumns = ['name', 'email', 'nip', 'phone', 'jabatan', 'pangkat_gol', 'created_at'];
        if (!in_array($sortBy, $allowedSortColumns, true)) {
            $sortBy = 'created_at';
        }

        $query->orderBy($sortBy, $sortDirection);

        return $query->paginate($perPage);
    }

    /**
     * Get a single employee by ID.
     */
    public function getPegawaiById(string $id, ?User $currentUser = null): User
    {
        $user = $currentUser ?? auth('sanctum')->user() ?? auth()->user();
        $pegawai = User::with(['roles', 'opd'])->findOrFail($id);

        if ($pegawai->hasRole('Superadmin') && !$user?->hasRole('Superadmin')) {
            abort(404, 'Data pegawai tidak ditemukan.');
        }

        return $pegawai;
    }

    /**
     * Find current Kepala OPD for a specific OPD.
     */
    public function getKepalaOpd(string $opdId, ?string $excludePegawaiId = null): ?User
    {
        return User::where('opd_id', $opdId)
            ->where('jabatan', 'Kepala OPD')
            ->when($excludePegawaiId, fn ($q) => $q->where('id', '!=', $excludePegawaiId))
            ->first();
    }

    /**
     * Synchronize the OPD's `kepala` column with the employee currently holding 'Kepala OPD' in that OPD.
     */
    public function syncOpdKepala(?string $opdId): void
    {
        if (empty($opdId)) {
            return;
        }

        $kepala = User::where('opd_id', $opdId)
            ->where('jabatan', 'Kepala OPD')
            ->first();

        Opd::where('id', $opdId)->update([
            'kepala' => $kepala?->name,
        ]);
    }

    /**
     * Create a new employee (Pegawai) without user login credentials.
     *
     * @param  array<string, mixed>  $data
     */
    public function createPegawai(array $data, ?User $currentUser = null): User
    {
        $actor = $currentUser ?? auth('sanctum')->user() ?? auth()->user();
        $opdId = (string) $data['opd_id'];
        $jabatan = (string) $data['jabatan'];
        $replaceKepala = (bool) ($data['replace_kepala'] ?? false);

        $existingKepala = null;
        if ($jabatan === 'Kepala OPD') {
            $existingKepala = $this->getKepalaOpd($opdId);
            if ($existingKepala && !$replaceKepala) {
                throw ValidationException::withMessages([
                    'jabatan' => [
                        "Instansi ini sudah memiliki Kepala OPD ({$existingKepala->name}). Silakan centang konfirmasi pergantian Kepala OPD untuk menggantikan pejabat saat ini.",
                    ],
                ]);
            }
        }

        return DB::transaction(function () use ($data, $opdId, $jabatan, $existingKepala, $actor) {
            if ($existingKepala) {
                $existingKepala->update(['jabatan' => 'Pegawai']);
            }

            $pegawai = User::create([
                'name' => trim((string) $data['name']),
                'email' => strtolower(trim((string) $data['email'])),
                'nip' => trim((string) $data['nip']),
                'phone' => trim((string) $data['phone']),
                'opd_id' => $opdId,
                'pangkat_gol' => trim((string) $data['pangkat_gol']),
                'jabatan' => $jabatan,
                'role' => null,
                'status' => null,
                'password' => null,
            ]);

            $this->syncOpdKepala($opdId);

            if ($existingKepala) {
                $opd = Opd::find($opdId);
                $this->auditLogService->log(
                    action: 'PEGAWAI_HANDOVER_KEPALA_OPD',
                    module: 'Manajemen Pegawai',
                    description: "Pergantian Kepala OPD {$opd?->nama}: {$pegawai->name} menggantikan {$existingKepala->name} (otomatis menjadi Pegawai)",
                    user: $actor,
                    context: [
                        'opd_id' => $opdId,
                        'opd_nama' => $opd?->nama,
                        'previous_kepala_id' => $existingKepala->id,
                        'previous_kepala_name' => $existingKepala->name,
                        'new_kepala_id' => $pegawai->id,
                        'new_kepala_name' => $pegawai->name,
                    ],
                    auditableType: User::class,
                    auditableId: $pegawai->id
                );
            }

            return $pegawai->load(['opd', 'roles']);
        });
    }

    /**
     * Update an existing employee (Pegawai), handling OPD mutation and Kepala OPD handover.
     *
     * @param  array<string, mixed>  $data
     */
    public function updatePegawai(User $pegawai, array $data, ?User $currentUser = null): User
    {
        $actor = $currentUser ?? auth('sanctum')->user() ?? auth()->user();

        if ($pegawai->hasRole('Superadmin') && !$actor?->hasRole('Superadmin')) {
            abort(404, 'Data pegawai tidak ditemukan.');
        }

        $newOpdId = (string) $data['opd_id'];
        $newJabatan = (string) $data['jabatan'];
        $replaceKepala = (bool) ($data['replace_kepala'] ?? false);

        $existingKepala = null;
        if ($newJabatan === 'Kepala OPD') {
            $existingKepala = $this->getKepalaOpd($newOpdId, $pegawai->id);
            if ($existingKepala && !$replaceKepala) {
                throw ValidationException::withMessages([
                    'jabatan' => [
                        "Instansi ini sudah memiliki Kepala OPD ({$existingKepala->name}). Silakan centang konfirmasi pergantian Kepala OPD untuk menggantikan pejabat saat ini.",
                    ],
                ]);
            }
        }

        return DB::transaction(function () use ($pegawai, $data, $newOpdId, $newJabatan, $existingKepala, $actor) {
            $oldOpdId = $pegawai->opd_id;

            if ($existingKepala) {
                $existingKepala->update(['jabatan' => 'Pegawai']);
            }

            $pegawai->update([
                'name' => trim((string) $data['name']),
                'email' => strtolower(trim((string) $data['email'])),
                'nip' => trim((string) $data['nip']),
                'phone' => trim((string) $data['phone']),
                'opd_id' => $newOpdId,
                'pangkat_gol' => trim((string) $data['pangkat_gol']),
                'jabatan' => $newJabatan,
            ]);

            $this->syncOpdKepala($newOpdId);
            if ($oldOpdId && $oldOpdId !== $newOpdId) {
                $this->syncOpdKepala($oldOpdId);
            }

            if ($existingKepala) {
                $opd = Opd::find($newOpdId);
                $this->auditLogService->log(
                    action: 'PEGAWAI_HANDOVER_KEPALA_OPD',
                    module: 'Manajemen Pegawai',
                    description: "Pergantian Kepala OPD {$opd?->nama}: {$pegawai->name} menggantikan {$existingKepala->name} (otomatis menjadi Pegawai)",
                    user: $actor,
                    context: [
                        'opd_id' => $newOpdId,
                        'opd_nama' => $opd?->nama,
                        'previous_kepala_id' => $existingKepala->id,
                        'previous_kepala_name' => $existingKepala->name,
                        'new_kepala_id' => $pegawai->id,
                        'new_kepala_name' => $pegawai->name,
                    ],
                    auditableType: User::class,
                    auditableId: $pegawai->id
                );
            }

            return $pegawai->load(['opd', 'roles']);
        });
    }

    /**
     * Delete an employee permanently with security safeguards and OPD kepala synchronization.
     */
    public function deletePegawai(User $pegawai, ?User $currentUser = null): void
    {
        $actor = $currentUser ?? auth('sanctum')->user() ?? auth()->user();

        if ($pegawai->hasRole('Superadmin') && !$actor?->hasRole('Superadmin')) {
            abort(404, 'Data pegawai tidak ditemukan.');
        }

        if ($actor && $pegawai->id === $actor->id) {
            throw ValidationException::withMessages([
                'pegawai' => ['Anda tidak dapat menghapus data pegawai Anda sendiri.'],
            ]);
        }

        if ($pegawai->hasRole('Superadmin')) {
            $superadminCount = User::role('Superadmin')->count();
            if ($superadminCount <= 1) {
                throw ValidationException::withMessages([
                    'pegawai' => ['Tidak dapat menghapus satu-satunya Superadmin di sistem.'],
                ]);
            }
        }

        // Safeguard: Check if employee has active authored records or is active Kepala OPD
        $hasAuthoredRecords = DB::table('tujuan_penilaians')->where('created_by', $pegawai->id)->exists()
            || DB::table('sasaran_penilaians')->where('created_by', $pegawai->id)->exists()
            || DB::table('indikator_penilaians')->where('created_by', $pegawai->id)->exists()
            || DB::table('konteks_penilaians')->where('created_by', $pegawai->id)->exists()
            || DB::table('konteks_operasionals')->where('created_by', $pegawai->id)->exists();

        $isKepalaOpd = DB::table('opds')->where('kepala_opd_id', $pegawai->id)->exists();

        if ($hasAuthoredRecords || $isKepalaOpd) {
            $reasons = [];
            if ($isKepalaOpd) {
                $reasons[] = 'sedang menjabat sebagai Kepala OPD aktif';
            }
            if ($hasAuthoredRecords) {
                $reasons[] = 'memiliki riwayat pembuatan dokumen perencanaan/penilaian risiko';
            }
            $reasonText = implode(' dan ', $reasons);

            throw ValidationException::withMessages([
                'pegawai' => ["Data pegawai tidak dapat dihapus karena {$reasonText}. Demi menjaga keutuhan riwayat dokumen dan integritas audit, silakan nonaktifkan akun terkait."],
            ]);
        }

        DB::transaction(function () use ($pegawai) {
            $oldOpdId = $pegawai->opd_id;
            $pegawai->tokens()->delete();
            $pegawai->syncRoles([]);
            $pegawai->delete();

            if ($oldOpdId) {
                $this->syncOpdKepala($oldOpdId);
            }
        });
    }
}
