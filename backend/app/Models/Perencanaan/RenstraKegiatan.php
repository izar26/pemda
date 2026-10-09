<?php

declare(strict_types=1);

namespace App\Models\Perencanaan;

use App\Models\Opd;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RenstraKegiatan extends Model
{
    use Auditable, HasFactory, HasUuids;

    protected $table = 'renstra_kegiatans';

    protected $fillable = [
        'renstra_program_id',
        'periode_penilaian_id',
        'opd_id',
        'kode',
        'nama',
        'indikator',
        'target',
        'satuan',
        'urutan',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(RenstraProgram::class, 'renstra_program_id');
    }

    public function periode(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
    }

    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }

    public function subKegiatans(): HasMany
    {
        return $this->hasMany(RenstraSubKegiatan::class, 'renstra_kegiatan_id')->orderBy('urutan', 'asc');
    }
}
