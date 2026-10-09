<?php

declare(strict_types=1);

namespace App\Models\Perencanaan;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sasaran extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'sasarans';

    protected $fillable = [
        'tujuan_id',
        'periode_penilaian_id',
        'nomor',
        'sasaran',
        'urutan',
    ];

    public function tujuan(): BelongsTo
    {
        return $this->belongsTo(Tujuan::class, 'tujuan_id');
    }

    public function periode(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
    }

    public function indikators(): HasMany
    {
        return $this->hasMany(IndikatorSasaran::class, 'sasaran_id')->orderBy('urutan', 'asc');
    }
}
