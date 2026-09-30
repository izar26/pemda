<?php

declare(strict_types=1);

namespace App\Models\Master;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MasterUrusanPemerintahan extends Model
{
    use HasFactory;

    protected $table = 'master_urusan_pemerintahans';

    protected $fillable = [
        'kode',
        'nama',
        'is_active',
        'urutan',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'urutan' => 'integer',
    ];
}
