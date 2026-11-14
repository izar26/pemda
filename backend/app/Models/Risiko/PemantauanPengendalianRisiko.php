<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PemantauanPengendalianRisiko extends Model
{
    use Auditable, HasUuid7;

    public string $auditModule = 'Pemantauan Pengendalian Risiko';

    protected $table = 'pemantauan_pengendalian_risikos';

    protected $guarded = ['id'];

    public function analisis(): BelongsTo
    {
        return $this->belongsTo(AnalisisRisiko::class, 'analisis_risiko_id');
    }
}
