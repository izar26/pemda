<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Master\MasterSubUnsurSpip;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnalisisRisiko extends Model
{
    use HasUuid7;

    protected $table = 'analisis_risikos';

    protected $guarded = ['id'];

    protected $casts = [
        'pengendalian_ada' => 'boolean',
        'pengendalian_memadai' => 'boolean',
        'inheren_kemungkinan' => 'integer',
        'inheren_dampak' => 'integer',
        'residual_kemungkinan' => 'integer',
        'residual_dampak' => 'integer',
    ];

    public function subUnsur(): BelongsTo
    {
        return $this->belongsTo(MasterSubUnsurSpip::class, 'sub_unsur_spip_id');
    }
}
