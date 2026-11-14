<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TindakPengendalianRisiko extends Model
{
    use Auditable, HasUuid7;

    public string $auditModule = 'Tindak Pengendalian Risiko';

    protected $table = 'tindak_pengendalian_risikos';

    protected $guarded = ['id'];

    protected $casts = [
        'treated_kemungkinan' => 'integer',
        'treated_dampak' => 'integer',
    ];

    public function analisis(): BelongsTo
    {
        return $this->belongsTo(AnalisisRisiko::class, 'analisis_risiko_id');
    }
}
