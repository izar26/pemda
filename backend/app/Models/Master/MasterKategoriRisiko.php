<?php

declare(strict_types=1);

namespace App\Models\Master;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MasterKategoriRisiko extends Model
{
    use HasFactory;

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
