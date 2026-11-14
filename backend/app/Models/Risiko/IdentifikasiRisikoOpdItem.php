<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Concerns\InvalidatesDerivedRiskForms;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class IdentifikasiRisikoOpdItem extends Model
{
    use Auditable, HasFactory, HasUuid7, InvalidatesDerivedRiskForms;

    protected $table = 'identifikasi_risiko_opd_items';

    public string $auditModule = 'Identifikasi Risiko Strategis OPD';

    protected $fillable = [
        'identifikasi_risiko_opd_id',
        'sasaran_penilaian_id',
        'sasaran_kustom',
        'indikator_penilaian_id',
        'indikator_kustom',
        'kategori_risiko',
        'nomor_urut',
        'pernyataan_risiko',
        'kode_risiko',
        'pemilik_risiko',
        'sifat_risiko',
        'uraian_dampak',
        'pihak_terkena',
        'urutan',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'nomor_urut' => 'integer',
        'urutan' => 'integer',
    ];

    public function dokumen(): BelongsTo
    {
        return $this->belongsTo(IdentifikasiRisikoOpd::class, 'identifikasi_risiko_opd_id');
    }

    public function sasaran(): BelongsTo
    {
        return $this->belongsTo(SasaranPenilaian::class, 'sasaran_penilaian_id');
    }

    public function indikator(): BelongsTo
    {
        return $this->belongsTo(IndikatorPenilaian::class, 'indikator_penilaian_id');
    }

    public function rca(): HasOne
    {
        return $this->hasOne(RootCauseAnalysis::class, 'identifikasi_risiko_opd_item_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Resolves the text of Sasaran Strategis (from relation or custom input).
     */
    public function getResolvedSasaranAttribute(): string
    {
        return $this->sasaran?->sasaran ?? $this->sasaran_kustom ?? '';
    }

    /**
     * Resolves the text of Indikator Kinerja (from relation or custom input).
     */
    public function getResolvedIndikatorAttribute(): string
    {
        return $this->indikator?->indikator ?? $this->indikator_kustom ?? '';
    }
}
