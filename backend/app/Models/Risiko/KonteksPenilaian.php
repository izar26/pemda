<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Master\MasterSumberData;
use App\Models\Opd;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KonteksPenilaian extends Model
{
    use Auditable, HasFactory, HasUuid7;

    protected $table = 'konteks_penilaians';

    protected $fillable = [
        'periode_penilaian_id',
        'opd_id',
        'sumber_data_id',
        'tujuan_penilaian_id',
        'nama_pemda',
        'informasi_lain',
        'nama_kepala',
        'nip_kepala',
        'jabatan_kepala',
        'tanggal_penetapan',
        'status',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'tanggal_penetapan' => 'date',
    ];

    public function periode(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
    }

    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }

    public function sumberData(): BelongsTo
    {
        return $this->belongsTo(MasterSumberData::class, 'sumber_data_id');
    }

    public function tujuan(): BelongsTo
    {
        return $this->belongsTo(TujuanPenilaian::class, 'tujuan_penilaian_id');
    }

    public function konteksSasarans(): HasMany
    {
        return $this->hasMany(KonteksPenilaianSasaran::class, 'konteks_penilaian_id')->orderBy('urutan', 'asc');
    }

    public function sasarans(): BelongsToMany
    {
        return $this->belongsToMany(
            SasaranPenilaian::class,
            'konteks_penilaian_sasarans',
            'konteks_penilaian_id',
            'sasaran_penilaian_id'
        )->withPivot(['urutan'])->withTimestamps()->orderBy('pivot_urutan', 'asc');
    }

    public function konteksIndikators(): HasMany
    {
        return $this->hasMany(KonteksPenilaianIndikator::class, 'konteks_penilaian_id')->orderBy('urutan', 'asc');
    }

    public function indikators(): BelongsToMany
    {
        return $this->belongsToMany(
            IndikatorPenilaian::class,
            'konteks_penilaian_indikators',
            'konteks_penilaian_id',
            'indikator_penilaian_id'
        )->withPivot(['urutan'])->withTimestamps()->orderBy('pivot_urutan', 'asc');
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
     * Scope for filter.
     *
     * @param array<string, mixed> $filters
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        return $query
            ->when(!empty($filters['periode_penilaian_id']), fn ($q) => $q->where('periode_penilaian_id', $filters['periode_penilaian_id']))
            ->when(!empty($filters['opd_id']), fn ($q) => $q->where('opd_id', $filters['opd_id']))
            ->when(!empty($filters['status']), fn ($q) => $q->where('status', $filters['status']))
            ->when(!empty($filters['search']), function ($q) use ($filters) {
                $search = $filters['search'];
                $q->where(function ($sub) use ($search) {
                    $sub->where('informasi_lain', 'ilike', "%{$search}%")
                        ->orWhere('nama_kepala', 'ilike', "%{$search}%")
                        ->orWhereHas('opd', fn ($opdQuery) => $opdQuery->where('nama', 'ilike', "%{$search}%")->orWhere('kode', 'ilike', "%{$search}%"))
                        ->orWhereHas('tujuan', fn ($tujQuery) => $tujQuery->where('tujuan', 'ilike', "%{$search}%"));
                });
            });
    }
}
