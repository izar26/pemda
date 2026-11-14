<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StatusFraudRiskAssessmentOpd extends Model
{
    use Auditable, HasFactory, HasUuid7;

    public string $auditModule = 'Status Nihil FRA (Penilaian Risiko Kecurangan)';

    protected $table = 'status_fraud_risk_assessment_opds';

    protected $fillable = [
        'opd_id',
        'periode_penilaian_id',
        'is_nihil',
        'confirmed_by',
        'confirmed_at',
        'catatan',
    ];

    protected $casts = [
        'is_nihil' => 'boolean',
        'confirmed_at' => 'datetime',
    ];

    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }

    public function periodePenilaian(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
