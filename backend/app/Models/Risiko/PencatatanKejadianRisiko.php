<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Master\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PencatatanKejadianRisiko extends Model
{
    use Auditable, HasFactory, HasUuid7;

    public string $auditModule = 'Pencatatan Kejadian Risiko (Form 10)';

    protected $table = 'pencatatan_kejadian_risikos';

    protected $fillable = [
        'opd_id',
        'periode_penilaian_id',
        'source_type',
        'identifikasi_risiko_pemda_item_id',
        'identifikasi_risiko_opd_item_id',
        'identifikasi_risiko_opd_operasional_item_id',
        'tanggal_kejadian',
        'sebab',
        'dampak',
        'keterangan',
        'realisasi_waktu_rtp',
        'keterangan_rtp',
    ];

    protected $casts = [
        'tanggal_kejadian' => 'date:Y-m-d',
    ];

    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }

    public function periodePenilaian(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
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

    public function getLinkedRisk(): ?Model
    {
        return match ($this->source_type) {
            '3a' => $this->itemPemda,
            '3b' => $this->itemOpd,
            '3c' => $this->itemOperasional,
            default => null,
        };
    }

    public function getRtpInfo(): ?array
    {
        $analysis = match ($this->source_type) {
            '3b' => $this->itemOpd?->analisis,
            '3c' => $this->itemOperasional?->analisis,
            default => null,
        };

        if (! $analysis) {
            return null;
        }

        return [
            'rencana_tindak' => $analysis->rencana_tindak,
            'target_waktu' => $analysis->tindakPengendalian?->target_waktu,
        ];
    }
}
