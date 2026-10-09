<?php

declare(strict_types=1);

namespace App\Models\Perencanaan;

use App\Models\Opd;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RenstraSubKegiatan extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'renstra_sub_kegiatans';

    protected $fillable = [
        'renstra_kegiatan_id',
        'periode_penilaian_id',
        'opd_id',
        'kode',
        'nama',
        'indikator',
        'target',
        'satuan',
        'sipd_id',
        'urutan',
    ];

    public function kegiatan(): BelongsTo
    {
        return $this->belongsTo(RenstraKegiatan::class, 'renstra_kegiatan_id');
    }

    public function periode(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
    }

    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }
}
