<?php

declare(strict_types=1);

namespace App\Models\Perencanaan;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PeriodePenilaian extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'periode_penilaians';

    protected $fillable = [
        'periode',
        'tahun',
        'tanggal_mulai',
        'tanggal_berakhir',
        'status',
        'catatan',
    ];

    protected $casts = [
        'tahun' => 'integer',
        'tanggal_mulai' => 'date',
        'tanggal_berakhir' => 'date',
    ];

    public function tujuans(): HasMany
    {
        return $this->hasMany(Tujuan::class, 'periode_penilaian_id');
    }

    public function sasarans(): HasMany
    {
        return $this->hasMany(Sasaran::class, 'periode_penilaian_id');
    }

    public function renstraPrograms(): HasMany
    {
        return $this->hasMany(RenstraProgram::class, 'periode_penilaian_id');
    }
}
