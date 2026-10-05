<?php

declare(strict_types=1);

namespace App\Models\Master;

use App\Models\Concerns\HasUuid7;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MasterKategoriRisiko extends Model
{
    use HasFactory, HasUuid7;

    protected $table = 'master_kategori_risikos';

    protected $fillable = [
        'kode',
        'nama',
        'definisi',
        'is_active',
        'urutan',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'urutan' => 'integer',
    ];
}
