<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PengajuanPenilaianRisikoItem extends Model
{
    use Auditable, HasFactory, HasUuid7;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const VALID_STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_SUBMITTED,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
    ];

    /**
     * Tier rank order used to evaluate whether an item is currently sitting
     * in revision below a reviewer's tier (yellow indicator).
     *
     * @var array<string, int>
     */
    public const TIER_ORDER = [
        PengajuanPenilaianRisiko::TIER_OPERATOR => 0,
        PengajuanPenilaianRisiko::TIER_KEPALA_OPD => 1,
        PengajuanPenilaianRisiko::TIER_AUDITOR => 2,
        PengajuanPenilaianRisiko::TIER_PENGAWAS => 3,
        PengajuanPenilaianRisiko::TIER_COMPLETED => 4,
    ];

    protected $table = 'pengajuan_penilaian_risiko_items';

    protected $fillable = [
        'pengajuan_id',
        'form_code',
        'current_tier',
        'status',
        'catatan_revisi',
        'status_kepala_opd',
        'catatan_kepala_opd',
        'status_auditor',
        'catatan_auditor',
        'status_pengawas',
        'catatan_pengawas',
        'reviewed_at',
        'reviewed_by',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function pengajuan(): BelongsTo
    {
        return $this->belongsTo(PengajuanPenilaianRisiko::class, 'pengajuan_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    public function isSubmitted(): bool
    {
        return $this->status === self::STATUS_SUBMITTED;
    }

    /**
     * Whether this item is currently sitting in revision below the given reviewer tier.
     */
    public function isInRevisionBelow(string $tier): bool
    {
        $itemRank = self::TIER_ORDER[$this->current_tier ?? PengajuanPenilaianRisiko::TIER_OPERATOR] ?? 0;
        $targetRank = self::TIER_ORDER[$tier] ?? 0;

        return $itemRank < $targetRank;
    }

    /**
     * Whether an Operator OPD is currently allowed to edit this specific form item.
     */
    public function isEditableByOperator(string $parentStatus): bool
    {
        if ($parentStatus === PengajuanPenilaianRisiko::STATUS_DRAFT) {
            return true;
        }

        return ($this->current_tier ?? PengajuanPenilaianRisiko::TIER_OPERATOR) === PengajuanPenilaianRisiko::TIER_OPERATOR;
    }
}
