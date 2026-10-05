<?php

declare(strict_types=1);

namespace App\Models\Master;

use App\Models\Concerns\HasUuid7;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MasterTingkatRisiko extends Model
{
    use HasFactory, HasUuid7;

    protected $table = 'master_tingkat_risikos';

    protected $fillable = [
        'kode',
        'nama',
        'deskripsi',
        'is_active',
        'urutan',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'urutan' => 'integer',
    ];
}
