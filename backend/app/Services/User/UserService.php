<?php

declare(strict_types=1);

namespace App\Services\User;

use App\Mail\UserInvitationMail;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UserService
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}
    /**
     * Get paginated and filtered list of users.
     *
     * @param  array<string, mixed>  $filters
     */
    public function getUsers(array $filters = [], int $perPage = 10, ?User $currentUser = null): LengthAwarePaginator
    {
        $user = $currentUser ?? auth('sanctum')->user() ?? auth()->user();
        $query = User::with(['roles', 'roles.permissions', 'opd']);

        // Ghost filter: non-superadmin users must not see Superadmin accounts
        if (!$user?->hasRole('Superadmin')) {
            $query->whereDoesntHave('roles', function ($q) {
                $q->where('name', 'Superadmin');
            })->where('role', '!=', 'Superadmin');
        }

        // Search by name, email, nip, jabatan, or pangkat
        if (!empty($filters['search'])) {
            $term = trim((string) $filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('email', 'like', "%{$term}%")
                    ->orWhere('nip', 'like', "%{$term}%")
                    ->orWhere('jabatan', 'like', "%{$term}%")
                    ->orWhere('pangkat_gol', 'like', "%{$term}%");
            });
        }

        // Filter by OPD (Instansi)
        if (!empty($filters['opd_id'])) {
            $query->where('opd_id', $filters['opd_id']);
        }

        // Filter by role
        if (!empty($filters['role'])) {
            $roleName = (string) $filters['role'];
            $query->whereHas('roles', function ($q) use ($roleName) {
                $q->where('name', $roleName);
            });
        }

        // Filter by status
        if (!empty($filters['status'])) {
            $query->where('status', (string) $filters['status']);
        }

        // Sorting
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDirection = strtolower($filters['sort_direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        $allowedSortColumns = ['name', 'email', 'nip', 'jabatan', 'status', 'created_at', 'last_login_at'];
        if (!in_array($sortBy, $allowedSortColumns, true)) {
            $sortBy = 'created_at';
        }


        $query->orderBy($sortBy, $sortDirection);

        return $query->paginate($perPage);
    }

    /**
     * Get a single user with relations.
     */
    public function getUserById(string|int $id, ?User $currentUser = null): User
    {
        $user = $currentUser ?? auth('sanctum')->user() ?? auth()->user();
        $targetUser = User::with(['roles', 'roles.permissions', 'opd'])->findOrFail($id);

        if ($targetUser->hasRole('Superadmin') && !$user?->hasRole('Superadmin')) {
            abort(404, 'Data pengguna tidak ditemukan.');
        }

        return $targetUser;
    }

    /**
     * Create a new user and assign role.
     *
     * @param  array<string, mixed>  $data
     */
    public function createUser(array $data, ?User $currentUser = null): User
    {
        $user = $currentUser ?? auth('sanctum')->user() ?? auth()->user();
        if (($data['role'] ?? '') === 'Superadmin' && !$user?->hasRole('Superadmin')) {
            throw ValidationException::withMessages([
                'role' => ['Peran yang dipilih tidak valid.'],
            ]);
        }

        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'nip' => $data['nip'] ?? null,
                'phone' => $data['phone'] ?? null,
                'opd_id' => $data['opd_id'] ?? null,
                'pangkat_gol' => $data['pangkat_gol'] ?? null,
                'jabatan' => $data['jabatan'] ?? null,
                'role' => $data['role'],
                'status' => $data['status'] ?? 'active',
                'password' => Hash::make($data['password']),
                'email_verified_at' => ($data['status'] ?? 'active') === 'active' ? now() : null,
            ]);

            $user->syncRoles([$data['role']]);

            return $user->load(['roles', 'roles.permissions', 'opd']);
        });
    }

    /**
     * Update an existing user.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateUser(User $user, array $data, User $currentUser): User
    {
        // Ghost safeguard: non-superadmin cannot see or update a Superadmin account
        if ($user->hasRole('Superadmin') && !$currentUser->hasRole('Superadmin')) {
            abort(404, 'Data pengguna tidak ditemukan.');
        }

        // Cannot assign Superadmin role if not Superadmin
        if (($data['role'] ?? '') === 'Superadmin' && !$currentUser->hasRole('Superadmin')) {
            throw ValidationException::withMessages([
                'role' => ['Peran yang dipilih tidak valid.'],
            ]);
        }

        // Safeguard: Cannot demote the last Superadmin
        if ($user->hasRole('Superadmin') && $data['role'] !== 'Superadmin') {
            $superadminCount = User::role('Superadmin')->count();
            if ($superadminCount <= 1) {
                throw ValidationException::withMessages([
                    'role' => 'Tidak dapat mengubah peran ini. Sistem harus memiliki setidaknya satu Superadmin aktif.',
                ]);
            }
        }

        // Safeguard: Cannot deactivate self
        if ($user->id === $currentUser->id && isset($data['status']) && $data['status'] !== 'active') {
            throw ValidationException::withMessages([
                'status' => 'Anda tidak dapat menonaktifkan akun Anda sendiri demi alasan keamanan.',
            ]);
        }

        return DB::transaction(function () use ($user, $data) {
            $updatePayload = [
                'name' => $data['name'],
                'email' => $data['email'],
                'nip' => $data['nip'] ?? null,
                'phone' => $data['phone'] ?? null,
                'opd_id' => array_key_exists('opd_id', $data) ? $data['opd_id'] : $user->opd_id,
                'pangkat_gol' => array_key_exists('pangkat_gol', $data) ? $data['pangkat_gol'] : $user->pangkat_gol,
                'jabatan' => array_key_exists('jabatan', $data) ? $data['jabatan'] : $user->jabatan,
                'role' => $data['role'],
                'status' => $data['status'],
            ];

            if (!empty($data['password'])) {
                $updatePayload['password'] = Hash::make($data['password']);
            }

            $user->update($updatePayload);
            $user->syncRoles([$data['role']]);

            return $user->load(['roles', 'roles.permissions', 'opd']);
        });
    }


    /**
     * Delete a user with security safeguards.
     */
    public function deleteUser(User $user, User $currentUser): void
    {
        // Ghost safeguard: non-superadmin cannot see or delete a Superadmin account
        if ($user->hasRole('Superadmin') && !$currentUser->hasRole('Superadmin')) {
            abort(404, 'Data pengguna tidak ditemukan.');
        }

        // Safeguard: Cannot delete self
        if ($user->id === $currentUser->id) {
            throw ValidationException::withMessages([
                'user' => 'Anda tidak dapat menghapus akun Anda sendiri.',
            ]);
        }

        // Safeguard: Cannot delete the last Superadmin
        if ($user->hasRole('Superadmin')) {
            $superadminCount = User::role('Superadmin')->count();
            if ($superadminCount <= 1) {
                throw ValidationException::withMessages([
                    'user' => 'Tidak dapat menghapus satu-satunya akun Superadmin yang ada di sistem.',
                ]);
            }
        }

        DB::transaction(function () use ($user) {
            // Revoke all Sanctum tokens
            $user->tokens()->delete();
            $user->delete();
        });
    }

    /**
     * Reset 2FA for a user (e.g. if employee lost device).
     */
    public function resetTwoFactor(User $user, ?User $admin = null): void
    {
        $adminUser = $admin ?? auth('sanctum')->user() ?? auth()->user();

        // Ghost safeguard: non-superadmin cannot reset 2FA on a Superadmin account
        if ($user->hasRole('Superadmin') && !$adminUser?->hasRole('Superadmin')) {
            abort(404, 'Data pengguna tidak ditemukan.');
        }

        DB::transaction(function () use ($user, $adminUser) {
            User::withoutAuditing(function () use ($user) {
                $user->update([
                    'two_factor_secret' => null,
                    'two_factor_recovery_codes' => null,
                    'two_factor_confirmed_at' => null,
                ]);
            });

            // Revoke active sessions to ensure account integrity
            $user->tokens()->delete();

            $adminUser = $admin ?? auth('sanctum')->user() ?? auth()->user();
            $this->auditLogService->log(
                action: 'USER_RESET_2FA',
                module: 'Pegawai',
                description: "Mereset autentikasi dua faktor (2FA) untuk pegawai {$user->name} ({$user->email})",
                user: $adminUser,
                context: [
                    'target_user_id' => $user->id,
                    'target_email' => $user->email,
                    'target_name' => $user->name,
                ],
                auditableType: User::class,
                auditableId: $user->id
            );
        });
    }

    /**
     * Invite a new user by sending an activation email.
     *
     * @param  array{name: string, email: string, role: string, notes?: string|null}  $data
     */
    public function inviteUser(array $data, User $admin): array
    {
        if (($data['role'] ?? '') === 'Superadmin' && !$admin->hasRole('Superadmin')) {
            throw ValidationException::withMessages([
                'role' => ['Peran yang dipilih tidak valid.'],
            ]);
        }

        return DB::transaction(function () use ($data, $admin) {
            $token = Str::random(64);
            $expiresAt = now()->addHours(48);

            // Create user in pending_activation status with an unguessable placeholder password
            $user = User::create([
                'name' => trim($data['name']),
                'email' => strtolower(trim($data['email'])),
                'opd_id' => $data['opd_id'] ?? null,
                'jabatan' => !empty($data['jabatan']) ? trim($data['jabatan']) : null,
                'role' => $data['role'],
                'status' => 'pending_activation',
                'password' => Hash::make(Str::random(32)),
                'activation_token' => $token,
                'activation_token_expires_at' => $expiresAt,
                'invitation_sent_at' => now(),
                'invitation_notes' => !empty($data['notes']) ? trim($data['notes']) : null,
            ]);

            $user->syncRoles([$data['role']]);

            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            $activationUrl = rtrim($frontendUrl, '/') . '/activate?token=' . $token;

            // Send notification email
            try {
                Mail::to($user->email)->send(
                    new UserInvitationMail($user, $activationUrl, $user->invitation_notes)
                );
            } catch (\Throwable $e) {
                // If mail driver fails, log and continue in dev
                report($e);
            }

            // Record in audit log
            $this->auditLogService->log(
                action: 'USER_INVITE',
                module: 'Pegawai',
                description: "Mengirim undangan aktivasi akun ke {$user->email} ({$user->name}) sebagai {$data['role']}",
                user: $admin,
                context: [
                    'invited_user_id' => $user->id,
                    'invited_email' => $user->email,
                    'role' => $data['role'],
                    'opd_id' => $user->opd_id,
                ]
            );

            return [
                'user' => $user->load(['roles', 'roles.permissions', 'opd']),
                'activation_url' => $activationUrl,
            ];
        });
    }

    /**
     * Resend an activation invitation email.
     */
    public function resendInvitation(User $user, User $admin): array
    {
        // Ghost safeguard: non-superadmin cannot see or resend invitation to a Superadmin account
        if ($user->hasRole('Superadmin') && !$admin->hasRole('Superadmin')) {
            abort(404, 'Data pengguna tidak ditemukan.');
        }

        if (!$user->isPendingActivation()) {
            throw ValidationException::withMessages([
                'user' => 'Pengguna ini sudah aktif atau tidak dalam status menunggu aktivasi.',
            ]);
        }

        return DB::transaction(function () use ($user, $admin) {
            $token = Str::random(64);
            $expiresAt = now()->addHours(48);

            $user->update([
                'activation_token' => $token,
                'activation_token_expires_at' => $expiresAt,
                'invitation_sent_at' => now(),
            ]);

            $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
            $activationUrl = rtrim($frontendUrl, '/') . '/activate?token=' . $token;

            try {
                Mail::to($user->email)->send(
                    new UserInvitationMail($user, $activationUrl, $user->invitation_notes)
                );
            } catch (\Throwable $e) {
                report($e);
            }

            $this->auditLogService->log(
                action: 'USER_INVITE_RESEND',
                module: 'Pegawai',
                description: "Mengirim ulang undangan aktivasi akun ke {$user->email} ({$user->name})",
                user: $admin,
                context: ['target_user_id' => $user->id]
            );

            return [
                'user' => $user->load(['roles', 'roles.permissions', 'opd']),
                'activation_url' => $activationUrl,
            ];
        });
    }

    /**
     * Validate an activation token.
     */
    public function validateActivationToken(string $token): User
    {
        if (empty($token) || strlen($token) < 32) {
            throw ValidationException::withMessages([
                'token' => 'Tautan aktivasi tidak valid atau telah rusak.',
            ]);
        }

        $user = User::where('activation_token', $token)->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'token' => 'Tautan aktivasi tidak ditemukan atau sudah pernah digunakan.',
            ]);
        }

        if (!$user->isPendingActivation()) {
            throw ValidationException::withMessages([
                'token' => 'Akun ini sudah aktif. Silakan langsung masuk ke portal.',
            ]);
        }

        if (!$user->hasValidActivationToken()) {
            throw ValidationException::withMessages([
                'token' => 'Tautan aktivasi telah kadaluwarsa (melebihi 48 jam). Harap hubungi Administrator untuk mengirim ulang undangan.',
            ]);
        }

        return $user->load(['roles', 'opd']);
    }

    /**
     * Activate user account with password, NIP, phone, and profile details.
     *
     * @param  array{password: string, nip?: string|null, phone?: string|null, name?: string|null, pangkat_gol?: string|null, jabatan?: string|null, opd_id?: int|null}  $data
     */
    public function activateUser(string $token, array $data): User
    {
        $user = $this->validateActivationToken($token);

        return DB::transaction(function () use ($user, $data) {
            $updatePayload = [
                'name' => !empty($data['name']) ? trim($data['name']) : $user->name,
                'nip' => !empty($data['nip']) ? trim($data['nip']) : $user->nip,
                'phone' => !empty($data['phone']) ? trim($data['phone']) : $user->phone,
                'pangkat_gol' => !empty($data['pangkat_gol']) ? trim($data['pangkat_gol']) : $user->pangkat_gol,
                'jabatan' => !empty($data['jabatan']) ? trim($data['jabatan']) : $user->jabatan,
                'password' => Hash::make($data['password']),
                'status' => 'active',
                'email_verified_at' => now(),
                'activation_token' => null,
                'activation_token_expires_at' => null,
            ];

            if (!empty($data['opd_id'])) {
                $updatePayload['opd_id'] = $data['opd_id'];
            }

            $user->update($updatePayload);

            $this->auditLogService->log(
                action: 'USER_ACTIVATED',
                module: 'Autentikasi',
                description: "Pegawai {$user->name} ({$user->email}) berhasil mengaktifkan akun dan melengkapi profil mandiri.",
                user: $user,
                context: ['activated_user_id' => $user->id]
            );

            return $user->load(['roles', 'opd']);
        });
    }

    /**
     * Update current authenticated user's own profile.
     *
     * @param  array<string, mixed>  $data
     */
    public function updateProfile(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data) {
            $updatePayload = [
                'name' => trim($data['name']),
                'nip' => !empty($data['nip']) ? trim($data['nip']) : null,
                'phone' => !empty($data['phone']) ? trim($data['phone']) : null,
                'pangkat_gol' => !empty($data['pangkat_gol']) ? trim($data['pangkat_gol']) : null,
                'jabatan' => !empty($data['jabatan']) ? trim($data['jabatan']) : null,
            ];

            if (array_key_exists('opd_id', $data) && !empty($data['opd_id'])) {
                $updatePayload['opd_id'] = $data['opd_id'];
            }

            $changes = [];
            foreach ($updatePayload as $key => $newVal) {
                $oldVal = $user->getOriginal($key);
                if ($oldVal != $newVal) {
                    $changes[$key] = [
                        'old' => $oldVal,
                        'new' => $newVal,
                    ];
                }
            }

            User::withoutAuditing(function () use ($user, $updatePayload) {
                $user->update($updatePayload);
            });

            $this->auditLogService->log(
                action: 'USER_PROFILE_UPDATE',
                module: 'Profil',
                description: "Pegawai {$user->name} memperbarui data profil akun kedinasan",
                user: $user,
                context: [
                    'action_type' => 'UPDATE',
                    'entity_name' => 'Pegawai',
                    'record_title' => $user->name,
                    'user_id' => $user->id,
                    'changes' => $changes,
                ],
                auditableType: User::class,
                auditableId: $user->id
            );

            return $user->load(['roles', 'roles.permissions', 'opd']);
        });
    }

}
