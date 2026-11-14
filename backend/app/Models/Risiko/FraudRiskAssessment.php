<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Master\MasterJenisFraud;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FraudRiskAssessment extends Model
{
    use Auditable, HasFactory, HasUuid7;

    public string $auditModule = 'Penilaian Risiko Kecurangan (FRA)';

    protected $table = 'fraud_risk_assessments';

    protected $fillable = [
        'opd_id',
        'periode_penilaian_id',
        'nomor_urut',
        'proses_bisnis',
        'identifikasi_risiko_kecurangan',
        'skenario_kecurangan',
        'jenis_fraud_id',
        'jenis_risiko_kecurangan',
        'pemilik_risiko',
        'penyebab',
        'existing_control',
        'kemungkinan_kriteria',
        'kemungkinan_skor',
        'dampak_kriteria',
        'dampak_skor',
        'skala_risiko',
        'mitigasi',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'nomor_urut' => 'integer',
        'kemungkinan_skor' => 'integer',
        'dampak_skor' => 'integer',
        'skala_risiko' => 'integer',
    ];

    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }

    public function periodePenilaian(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
    }

    public function jenisFraud(): BelongsTo
    {
        return $this->belongsTo(MasterJenisFraud::class, 'jenis_fraud_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
