<?php

namespace App\Models;

use App\Models\Concerns\HasUuid7;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Traits\Auditable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Contracts\Role;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Auditable, HasApiTokens, HasFactory, HasUuid7, Notifiable;

    use HasRoles {
        assignRole as spatieAssignRole;
        syncRoles as spatieSyncRoles;
    }

    /**
     * Attributes excluded from model update audit logging to reduce noise.
     *
     * @var array<string>
     */
    protected array $auditExclude = [
        'failed_login_attempts',
        'last_login_at',
        'last_login_ip',
    ];

    /**
     * The guard name for Spatie permissions.
     */
    protected string $guard_name = 'web';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'nip',
        'phone',
        'opd_id',
        'pangkat_gol',
        'jabatan',
        'role',
        'status',

        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'two_factor_confirmed_at',
        'failed_login_attempts',
        'lockout_until',
        'last_login_at',
        'last_login_ip',
        'activation_token',
        'activation_token_expires_at',
        'invitation_sent_at',
        'invitation_notes',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_secret' => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at' => 'datetime',
            'lockout_until' => 'datetime',
            'last_login_at' => 'datetime',
            'failed_login_attempts' => 'integer',
            'activation_token_expires_at' => 'datetime',
            'invitation_sent_at' => 'datetime',
        ];
    }

    public function loginLogs(): HasMany
    {
        return $this->hasMany(LoginLog::class);
    }

    /**
     * Get the OPD to which the employee belongs.
     *
     * @return BelongsTo<Opd, $this>
     */
    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }

    public function hasTwoFactorEnabled(): bool
    {
        return ! is_null($this->two_factor_confirmed_at) && ! empty($this->two_factor_secret);
    }

    public function isLockedOut(): bool
    {
        return ! is_null($this->lockout_until) && $this->lockout_until->isFuture();
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function hasAccount(): bool
    {
        return ! empty($this->password);
    }

    public function isPendingActivation(): bool
    {
        return $this->status === 'pending_activation';
    }

    public function hasValidActivationToken(): bool
    {
        return ! empty($this->activation_token)
            && ! is_null($this->activation_token_expires_at)
            && $this->activation_token_expires_at->isFuture();
    }

    /**
     * @return HasMany<AuditorOpdAssignment, $this>
     */
    public function auditorAssignments(): HasMany
    {
        return $this->hasMany(AuditorOpdAssignment::class, 'auditor_id');
    }

    /**
     * Map legacy role names to modern aliases and vice-versa for resilience.
     */
    protected const ROLE_ALIASES = [
        'opd' => ['Operator OPD', 'OPD'],
        'operator opd' => ['Operator OPD', 'OPD'],
        'auditor' => ['Evaluator / Reviewer', 'Auditor'],
        'evaluator / reviewer' => ['Evaluator / Reviewer', 'Auditor'],
        'evaluator/reviewer' => ['Evaluator / Reviewer', 'Auditor'],
        'evaluator' => ['Evaluator / Reviewer', 'Auditor'],
        'inspektorat' => ['Koordinator Pengawas', 'Inspektorat'],
        'koordinator pengawas' => ['Koordinator Pengawas', 'Inspektorat'],
        'admin office' => ['Administrator', 'Admin Office'],
        'administrator' => ['Administrator', 'Admin Office'],
        'admin' => ['Administrator', 'Admin Office'],
        'executive' => ['Executive', 'Kepala OPD'],
        'kepala opd' => ['Executive', 'Kepala OPD'],
    ];

    /**
     * Normalize role name or list of roles expanding aliases.
     *
     * @return array<int, string>
     */
    public function expandRoleAliases(mixed $roles): array
    {
        if ($roles instanceof Collection) {
            $roles = $roles->all();
        }

        $items = is_array($roles) ? $roles : [$roles];

        $flattened = [];
        array_walk_recursive($items, function ($item) use (&$flattened) {
            if ($item instanceof Collection) {
                foreach ($item as $subItem) {
                    $flattened[] = $subItem;
                }
            } else {
                $flattened[] = $item;
            }
        });

        $expanded = [];
        foreach ($flattened as $role) {
            if ($role instanceof Role || $role instanceof \App\Models\Role) {
                $role = $role->name;
            }
            if (! is_string($role)) {
                continue;
            }

            $lower = strtolower(trim($role));
            if (isset(self::ROLE_ALIASES[$lower])) {
                foreach (self::ROLE_ALIASES[$lower] as $alias) {
                    $expanded[] = $alias;
                }
            } else {
                $expanded[] = $role;
            }
        }

        return array_values(array_unique($expanded));
    }

    /**
     * Check if the user has any of the given role(s), automatically resolving aliases.
     */
    public function hasRole($roles, ?string $guard = null): bool
    {
        $expanded = $this->expandRoleAliases($roles);

        $this->loadMissing('roles');

        $userRoles = $guard
            ? $this->roles->where('guard_name', $guard)->pluck('name')
            : $this->roles->pluck('name');

        foreach ($expanded as $role) {
            if ($userRoles->contains($role)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if the user has any of the given roles, automatically resolving aliases.
     */
    public function hasAnyRole(...$roles): bool
    {
        return $this->hasRole($roles);
    }

    /**
     * Resolve role aliases to database role records or names.
     *
     * @param  array<int, mixed>  $roles
     * @return array<int, mixed>
     */
    protected function resolveRoleAssignments(array $roles): array
    {
        $flattened = [];
        array_walk_recursive($roles, function ($item) use (&$flattened) {
            $flattened[] = $item;
        });

        $guard = $this->guard_name ?? 'web';
        $mapped = [];

        foreach ($flattened as $role) {
            if ($role instanceof Role || $role instanceof \App\Models\Role || ! is_string($role)) {
                $mapped[] = $role;

                continue;
            }

            if (\App\Models\Role::where('name', $role)->where('guard_name', $guard)->exists()) {
                $mapped[] = $role;
            } else {
                $expanded = $this->expandRoleAliases($role);
                $existing = \App\Models\Role::whereIn('name', $expanded)->where('guard_name', $guard)->first();
                $mapped[] = $existing ? $existing->name : $role;
            }
        }

        return $mapped;
    }

    public function assignRole(...$roles): static
    {
        $mapped = $this->resolveRoleAssignments($roles);

        return $this->spatieAssignRole($mapped);
    }

    public function syncRoles(...$roles): static
    {
        $mapped = $this->resolveRoleAssignments($roles);

        return $this->spatieSyncRoles($mapped);
    }

    /**
     * Whether this user is an admin that has full cross-OPD system access.
     */
    public function isRegionalAdmin(): bool
    {
        if ($this->hasRole(['Superadmin', 'Administrator'])) {
            return true;
        }

        return $this->can('settings.edit') || $this->can('roles.edit');
    }

    /**
     * Whether this user is an Auditor / Evaluator whose data access must be limited to the
     * OPDs they are assigned to (Superadmin / Administrator / Inspektorat see all).
     */
    public function isScopedAuditor(): bool
    {
        $isEvaluator = $this->hasRole(['Evaluator / Reviewer', 'Auditor']) || $this->can('review_risiko.approve');
        $isUnrestricted = $this->isRegionalAdmin()
            || $this->hasRole(['Koordinator Pengawas', 'Inspektorat'])
            || $this->can('review_risiko.review_pengawas');

        return $isEvaluator && ! $isUnrestricted;
    }

    /**
     * Whether this user is a Regional Executive Leader (Bupati, Wakil Bupati, Sekda) who
     * has cross-regional scope and does not belong to a single OPD.
     */
    public function isRegionalLeader(): bool
    {
        $leadershipTitles = ['Bupati', 'Wakil Bupati', 'Sekda', 'Sekretaris Daerah', 'Pimpinan Daerah'];
        if (in_array($this->jabatan, $leadershipTitles, true)) {
            return true;
        }

        return empty($this->opd_id) && $this->hasRole('Executive');
    }

    /**
     * Whether this user's access should be strictly isolated to their own OPD.
     */
    public function isRestrictedToOpd(): bool
    {
        if ($this->isRegionalAdmin() || $this->isScopedAuditor() || $this->isRegionalLeader()) {
            return false;
        }

        if ($this->hasRole(['Koordinator Pengawas', 'Inspektorat', 'Bapperida']) || $this->can('review_risiko.review_pengawas')) {
            return false;
        }

        if ($this->hasRole(['Operator OPD', 'OPD'])) {
            return true;
        }

        if ($this->hasRole('Executive') && ! empty($this->opd_id)) {
            return true;
        }

        return ! empty($this->opd_id);
    }

    /**
     * IDs of OPDs that this auditor is actively assigned to.
     *
     * @return array<int, string>
     */
    public function activeAssignedOpdIds(): array
    {
        $fromAssignment = AuditorOpdAssignment::where('auditor_id', $this->id)
            ->where('is_active', true)
            ->pluck('opd_id')
            ->map(fn ($id) => (string) $id)
            ->all();

        $fromSubmission = PengajuanPenilaianRisiko::where('auditor_id', $this->id)
            ->pluck('opd_id')
            ->map(fn ($id) => (string) $id)
            ->all();

        return array_values(array_unique(array_merge($fromAssignment, $fromSubmission)));
    }

    /**
     * Whether a scoped auditor is allowed to read data of the given OPD.
     * Always true for users that are not scoped auditors.
     */
    public function canReadOpdData(?string $opdId): bool
    {
        if (! $this->isScopedAuditor()) {
            return true;
        }

        return $opdId !== null && in_array((string) $opdId, $this->activeAssignedOpdIds(), true);
    }

    /**
     * @return BelongsToMany<Opd, $this>
     */
    public function assignedOpds(): BelongsToMany
    {
        return $this->belongsToMany(Opd::class, 'auditor_opd_assignments', 'auditor_id', 'opd_id')
            ->withPivot(['id', 'periode_penilaian_id', 'nomor_surat_tugas', 'tanggal_mulai', 'tanggal_selesai', 'catatan', 'is_active'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<PengajuanPenilaianRisiko, $this>
     */
    public function pengajuanRisikoAssigned(): HasMany
    {
        return $this->hasMany(PengajuanPenilaianRisiko::class, 'auditor_id');
    }
}
