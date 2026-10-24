<?php

namespace App\Models;

use App\Models\Concerns\HasUuid7;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Traits\Auditable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Auditable, HasApiTokens, HasFactory, HasRoles, HasUuid7, Notifiable;

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
        return !is_null($this->two_factor_confirmed_at) && !empty($this->two_factor_secret);
    }

    public function isLockedOut(): bool
    {
        return !is_null($this->lockout_until) && $this->lockout_until->isFuture();
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function hasAccount(): bool
    {
        return !empty($this->password);
    }

    public function isPendingActivation(): bool
    {
        return $this->status === 'pending_activation';
    }

    public function hasValidActivationToken(): bool
    {
        return !empty($this->activation_token)
            && !is_null($this->activation_token_expires_at)
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
     * Whether this user is an Auditor whose data access must be limited to the
     * OPDs they are assigned to (Superadmin / Admin Office / Inspektorat see all).
     */
    public function isScopedAuditor(): bool
    {
        return $this->hasRole('Auditor')
            && !$this->hasRole(['Superadmin', 'Admin Office', 'Inspektorat']);
    }

    /**
     * IDs of OPDs that this auditor is actively assigned to.
     *
     * @return array<int, string>
     */
    public function activeAssignedOpdIds(): array
    {
        return AuditorOpdAssignment::where('auditor_id', $this->id)
            ->where('is_active', true)
            ->pluck('opd_id')
            ->map(fn ($id) => (string) $id)
            ->all();
    }

    /**
     * Whether a scoped auditor is allowed to read data of the given OPD.
     * Always true for users that are not scoped auditors.
     */
    public function canReadOpdData(?string $opdId): bool
    {
        if (!$this->isScopedAuditor()) {
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
     * @return HasMany<\App\Models\Risiko\PengajuanPenilaianRisiko, $this>
     */
    public function pengajuanRisikoAssigned(): HasMany
    {
        return $this->hasMany(\App\Models\Risiko\PengajuanPenilaianRisiko::class, 'auditor_id');
    }
}
