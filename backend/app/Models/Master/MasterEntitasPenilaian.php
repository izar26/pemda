<?php

declare(strict_types=1);

namespace App\Models\Master;

use App\Models\Opd;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MasterEntitasPenilaian extends Model
{
    use HasFactory;

    protected $table = 'master_entitas_penilaians';

    protected $fillable = [
        'kode',
        'nama',
        'opd_id',
        'is_active',
        'urutan',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'urutan' => 'integer',
        'opd_id' => 'integer',
    ];

    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }
}
