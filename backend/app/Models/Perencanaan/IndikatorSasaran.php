<?php

declare(strict_types=1);

namespace App\Models\Perencanaan;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IndikatorSasaran extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'indikator_sasarans';

    protected $fillable = [
        'sasaran_id',
        'periode_penilaian_id',
        'nomor',
        'indikator',
        'jenis',
        'satuan',
        'target',
        'urutan',
    ];

    public function sasaran(): BelongsTo
    {
        return $this->belongsTo(Sasaran::class, 'sasaran_id');
    }

    public function periode(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
    }
}
