<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Concerns\InvalidatesDerivedRiskForms;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class IdentifikasiRisikoOpdOperasionalItem extends Model
{
    use Auditable, HasFactory, HasUuid7, InvalidatesDerivedRiskForms;

    protected $table = 'identifikasi_risiko_opd_operasional_items';

    public string $auditModule = 'Identifikasi Risiko Operasional OPD';

    protected $fillable = [
        'identifikasi_risiko_opd_operasional_id',
        'operasional_sub_kegiatan_id',
        'sub_kegiatan_kustom',
        'indikator_keluaran_kustom',
        'probis',
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
        return $this->belongsTo(IdentifikasiRisikoOpdOperasional::class, 'identifikasi_risiko_opd_operasional_id');
    }

    public function subKegiatan(): BelongsTo
    {
        return $this->belongsTo(KonteksOperasionalItem::class, 'operasional_sub_kegiatan_id');
    }

    public function rca(): HasOne
    {
        return $this->hasOne(RootCauseAnalysis::class, 'identifikasi_risiko_opd_operasional_item_id');
    }

    public function analisis(): HasOne
    {
        return $this->hasOne(AnalisisRisiko::class, 'risiko_operasional_item_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function getResolvedProgramAttribute(): ?string
    {
        if ($this->subKegiatan) {
            $parent = $this->subKegiatan->parent;
            if ($parent && $parent->parent) {
                return $parent->parent->nama;
            }
        }

        return null;
    }

    public function getResolvedKegiatanAttribute(): ?string
    {
        if ($this->subKegiatan) {
            $parent = $this->subKegiatan->parent;
            if ($parent) {
                return $parent->nama;
            }
        }

        return null;
    }

    public function getResolvedSubKegiatanAttribute(): string
    {
        if (! empty($this->sub_kegiatan_kustom)) {
            return $this->sub_kegiatan_kustom;
        }

        if ($this->subKegiatan) {
            return ($this->subKegiatan->kode ? $this->subKegiatan->kode.' ' : '').$this->subKegiatan->nama;
        }

        return '-';
    }

    public function getResolvedIndikatorAttribute(): ?string
    {
        if (! empty($this->indikator_keluaran_kustom)) {
            return $this->indikator_keluaran_kustom;
        }

        if ($this->subKegiatan && $this->subKegiatan->relationLoaded('indikators')) {
            $firstIndikator = $this->subKegiatan->indikators->first();
            if ($firstIndikator) {
                return $firstIndikator->indikator.($firstIndikator->target ? ' (Target: '.$firstIndikator->target.' '.$firstIndikator->satuan.')' : '');
            }
        }

        return null;
    }
}
