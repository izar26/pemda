<?php

namespace App\Models;

use App\Traits\Auditable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Auditable, HasApiTokens, HasFactory, HasRoles, Notifiable;

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
}
