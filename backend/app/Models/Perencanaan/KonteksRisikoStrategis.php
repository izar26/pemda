<?php

declare(strict_types=1);

namespace App\Models\Perencanaan;

use App\Models\Opd;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KonteksRisikoStrategis extends Model
{
    use Auditable, HasFactory, HasUuids;

    protected $table = 'konteks_risiko_strategis';

    protected $fillable = [
        'periode_penilaian_id',
        'opd_id',
        'sumber_data',
        'tujuan_id',
        'sasaran_ids',
        'iku_ids',
        'informasi_lain',
        'kepala_opd_nama',
        'kepala_opd_nip',
        'tanggal_penetapan',
        'status',
    ];

    protected $casts = [
        'sasaran_ids' => 'array',
        'iku_ids' => 'array',
        'tanggal_penetapan' => 'date',
    ];

    public function periodePenilaian(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
    }

    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }

    public function tujuan(): BelongsTo
    {
        return $this->belongsTo(Tujuan::class, 'tujuan_id');
    }
}
