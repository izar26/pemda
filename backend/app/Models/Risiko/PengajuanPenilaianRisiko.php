<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PengajuanPenilaianRisiko extends Model
{
    use Auditable, HasFactory, HasUuid7;

    // Tiers
    public const TIER_OPERATOR = 'operator';

    public const TIER_KEPALA_OPD = 'kepala_opd';

    public const TIER_AUDITOR = 'auditor';

    public const TIER_PENGAWAS = 'pengawas';

    public const TIER_COMPLETED = 'completed';

    // 4-Tier Statuses
    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED_TO_KEPALA = 'submitted_to_kepala_opd';

    public const STATUS_REVISION_BY_KEPALA = 'revision_by_kepala_opd';

    public const STATUS_SUBMITTED_TO_AUDITOR = 'submitted_to_auditor';

    public const STATUS_IN_REVIEW_AUDITOR = 'in_review_auditor';

    public const STATUS_REVISION_BY_AUDITOR = 'revision_by_auditor';

    public const STATUS_REVISION_TO_OPERATOR = 'revision_to_operator';

    public const STATUS_SUBMITTED_TO_PENGAWAS = 'submitted_to_pengawas';

    public const STATUS_IN_REVIEW_PENGAWAS = 'in_review_pengawas';

    public const STATUS_REVISION_BY_PENGAWAS = 'revision_by_pengawas';

    public const STATUS_APPROVED = 'approved';

    // Legacy Aliases for backwards compatibility
    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_IN_REVIEW = 'in_review';

    public const STATUS_REVISION_REQUESTED = 'revision_requested';

    public const VALID_STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_SUBMITTED_TO_KEPALA,
        self::STATUS_REVISION_BY_KEPALA,
        self::STATUS_SUBMITTED_TO_AUDITOR,
        self::STATUS_IN_REVIEW_AUDITOR,
        self::STATUS_REVISION_BY_AUDITOR,
        self::STATUS_REVISION_TO_OPERATOR,
        self::STATUS_SUBMITTED_TO_PENGAWAS,
        self::STATUS_IN_REVIEW_PENGAWAS,
        self::STATUS_REVISION_BY_PENGAWAS,
        self::STATUS_APPROVED,
        self::STATUS_SUBMITTED,
        self::STATUS_IN_REVIEW,
        self::STATUS_REVISION_REQUESTED,
    ];

    protected $table = 'pengajuan_penilaian_risikos';

    protected $fillable = [
        'opd_id',
        'periode_penilaian_id',
        'auditor_id',
        'kepala_opd_id',
        'pengawas_id',
        'status',
        'current_tier',
        'submitted_at',
        'submitted_by',
        'kepala_opd_approved_at',
        'auditor_reviewed_at',
        'approved_at',
        'approved_by',
        'pengawas_approved_at',
        'catatan_umum',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'kepala_opd_approved_at' => 'datetime',
        'auditor_reviewed_at' => 'datetime',
        'approved_at' => 'datetime',
        'pengawas_approved_at' => 'datetime',
    ];

    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }

    public function periodePenilaian(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
    }

    public function auditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auditor_id');
    }

    public function kepalaOpd(): BelongsTo
    {
        return $this->belongsTo(User::class, 'kepala_opd_id');
    }

    public function pengawas(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pengawas_id');
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PengajuanPenilaianRisikoItem::class, 'pengajuan_id');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(PengajuanPenilaianRisikoHistory::class, 'pengajuan_id')->orderBy('created_at', 'desc');
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isSubmitted(): bool
    {
        return in_array($this->status, [
            self::STATUS_SUBMITTED,
            self::STATUS_SUBMITTED_TO_KEPALA,
            self::STATUS_SUBMITTED_TO_AUDITOR,
            self::STATUS_SUBMITTED_TO_PENGAWAS,
        ], true);
    }

    public function isInReview(): bool
    {
        return in_array($this->status, [
            self::STATUS_IN_REVIEW,
            self::STATUS_IN_REVIEW_AUDITOR,
            self::STATUS_IN_REVIEW_PENGAWAS,
        ], true);
    }

    public function isRevisionRequested(): bool
    {
        return in_array($this->status, [
            self::STATUS_REVISION_REQUESTED,
            self::STATUS_REVISION_BY_KEPALA,
            self::STATUS_REVISION_BY_AUDITOR,
            self::STATUS_REVISION_TO_OPERATOR,
            self::STATUS_REVISION_BY_PENGAWAS,
        ], true);
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    /**
     * Determines whether Operator editing is locked.
     * Operator can only edit when in draft, revision_by_kepala_opd, or revision_to_operator.
     */
    public function isLockedForOperator(): bool
    {
        return ! in_array($this->status, [
            self::STATUS_DRAFT,
            self::STATUS_REVISION_BY_KEPALA,
            self::STATUS_REVISION_TO_OPERATOR,
        ], true);
    }

    /**
     * Determines whether OPD editing is locked.
     */
    public function isLockedForOpd(): bool
    {
        return $this->isLockedForOperator();
    }
}
