<?php

declare(strict_types=1);

namespace App\Models\Master;

use App\Models\Concerns\HasUuid7;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksPenilaian;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterSumberData extends Model
{
    use HasFactory, HasUuid7;

    protected $table = 'master_sumber_datas';

    protected $fillable = [
        'nama',
        'deskripsi',
        'is_active',
        'urutan',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'urutan' => 'integer',
    ];

    /**
     * @return HasMany<TujuanPenilaian, $this>
     */
    public function tujuanPenilaians(): HasMany
    {
        return $this->hasMany(TujuanPenilaian::class, 'sumber_data_id');
    }

    /**
     * @return HasMany<KonteksPenilaian, $this>
     */
    public function konteksPenilaians(): HasMany
    {
        return $this->hasMany(KonteksPenilaian::class, 'sumber_data_id');
    }

    /**
     * @return HasMany<KonteksOperasional, $this>
     */
    public function konteksOperasionals(): HasMany
    {
        return $this->hasMany(KonteksOperasional::class, 'sumber_data_id');
    }
}

