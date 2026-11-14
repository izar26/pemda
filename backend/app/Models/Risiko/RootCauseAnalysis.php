<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Concerns\InvalidatesDerivedRiskForms;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RootCauseAnalysis extends Model
{
    use Auditable, HasFactory, HasUuid7, InvalidatesDerivedRiskForms;

    protected $table = 'root_cause_analyses';

    public string $auditModule = 'Root Cause Analysis (RCA)';

    protected $fillable = [
        'source_type',
        'identifikasi_risiko_pemda_item_id',
        'identifikasi_risiko_opd_item_id',
        'identifikasi_risiko_opd_operasional_item_id',
        'why_1',
        'why_2',
        'why_3',
        'why_4',
        'why_5',
        'akar_penyebab',
        'jenis_penyebab',
        'kegiatan_pengendalian',
        'created_by',
        'updated_by',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(IdentifikasiRisikoPemdaItem::class, 'identifikasi_risiko_pemda_item_id');
    }

    public function itemPemda(): BelongsTo
    {
        return $this->belongsTo(IdentifikasiRisikoPemdaItem::class, 'identifikasi_risiko_pemda_item_id');
    }

    public function itemOpd(): BelongsTo
    {
        return $this->belongsTo(IdentifikasiRisikoOpdItem::class, 'identifikasi_risiko_opd_item_id');
    }

    public function itemOperasional(): BelongsTo
    {
        return $this->belongsTo(IdentifikasiRisikoOpdOperasionalItem::class, 'identifikasi_risiko_opd_operasional_item_id');
    }

    /**
     * Get the associated risk item regardless of source type (3A, 3B, or 3C).
     */
    public function getRiskItemAttribute(): mixed
    {
        return match ($this->source_type) {
            '3c' => $this->itemOperasional,
            '3b' => $this->itemOpd,
            default => $this->itemPemda,
        };
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Compute Root Cause (Akar Penyebab) from the deepest non-empty Why (5 down to 1),
     * matching the exact Excel template formula logic.
     */
    public function computeAkarPenyebab(): ?string
    {
        if (! empty(trim((string) $this->why_5))) {
            return trim((string) $this->why_5);
        }
        if (! empty(trim((string) $this->why_4))) {
            return trim((string) $this->why_4);
        }
        if (! empty(trim((string) $this->why_3))) {
            return trim((string) $this->why_3);
        }
        if (! empty(trim((string) $this->why_2))) {
            return trim((string) $this->why_2);
        }
        if (! empty(trim((string) $this->why_1))) {
            return trim((string) $this->why_1);
        }

        return null;
    }
}
