<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Concerns\InvalidatesDerivedRiskForms;
use App\Models\Master\MasterSubUnsurSpip;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class AnalisisRisiko extends Model
{
    use Auditable, HasUuid7, InvalidatesDerivedRiskForms;

    public string $auditModule = 'Analisis Risiko';

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

    public function tindakPengendalian(): HasOne
    {
        return $this->hasOne(TindakPengendalianRisiko::class, 'analisis_risiko_id');
    }
}
