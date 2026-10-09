<?php

declare(strict_types=1);

namespace App\Models\Perencanaan;

use App\Models\Opd;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RenstraProgram extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'renstra_programs';

    protected $fillable = [
        'periode_penilaian_id',
        'opd_id',
        'kode',
        'nama',
        'indikator',
        'target',
        'satuan',
        'urutan',
    ];

    public function periode(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
    }

    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }

    public function kegiatans(): HasMany
    {
        return $this->hasMany(RenstraKegiatan::class, 'renstra_program_id')->orderBy('urutan', 'asc');
    }
}
