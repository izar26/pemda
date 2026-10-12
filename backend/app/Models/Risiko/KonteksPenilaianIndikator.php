<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Perencanaan\IndikatorPenilaian;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KonteksPenilaianIndikator extends Model
{
    use HasFactory, HasUuid7;

    protected $table = 'konteks_penilaian_indikators';

    protected $fillable = [
        'konteks_penilaian_id',
        'indikator_penilaian_id',
        'urutan',
    ];

    public function konteks(): BelongsTo
    {
        return $this->belongsTo(KonteksPenilaian::class, 'konteks_penilaian_id');
    }

    public function indikator(): BelongsTo
    {
        return $this->belongsTo(IndikatorPenilaian::class, 'indikator_penilaian_id');
    }
}
