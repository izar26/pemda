<?php

declare(strict_types=1);

namespace App\Models\Master;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MasterSubUnsurSpip extends Model
{
    use HasFactory;

    protected $table = 'master_sub_unsur_spips';

    protected $fillable = [
        'unsur_spip_id',
        'nama',
        'is_active',
        'urutan',
    ];

    protected $casts = [
        'unsur_spip_id' => 'integer',
        'is_active' => 'boolean',
        'urutan' => 'integer',
    ];

    public function unsur(): BelongsTo
    {
        return $this->belongsTo(MasterUnsurSpip::class, 'unsur_spip_id');
    }
}
