<?php

declare(strict_types=1);

namespace App\Models\Master;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MasterUnsurSpip extends Model
{
    use HasFactory;

    protected $table = 'master_unsur_spips';

    protected $fillable = [
        'nomor',
        'nama',
        'is_active',
        'urutan',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'urutan' => 'integer',
    ];

    public function subUnsurs(): HasMany
    {
        return $this->hasMany(MasterSubUnsurSpip::class, 'unsur_spip_id')->orderBy('urutan');
    }
}
