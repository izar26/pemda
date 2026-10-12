<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Perencanaan\SasaranPenilaian;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KonteksPenilaianSasaran extends Model
{
    use HasFactory, HasUuid7;

    protected $table = 'konteks_penilaian_sasarans';

    protected $fillable = [
        'konteks_penilaian_id',
        'sasaran_penilaian_id',
        'urutan',
    ];

    public function konteks(): BelongsTo
    {
        return $this->belongsTo(KonteksPenilaian::class, 'konteks_penilaian_id');
    }

    public function sasaran(): BelongsTo
    {
        return $this->belongsTo(SasaranPenilaian::class, 'sasaran_penilaian_id');
    }
}
