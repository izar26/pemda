<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Master\MasterSumberData;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

use App\Traits\Auditable;

class KonteksOperasional extends Model
{
    use Auditable, HasFactory, HasUuid7;

    protected $table = 'konteks_operasionals';

    protected $fillable = [
        'periode_penilaian_id',
        'opd_id',
        'sumber_data_id',
        'konteks_penilaian_id',
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

    /**
     * Relasi ke Konteks Penilaian Strategis (Form 2B) pada periode & OPD yang sama.
     */
    public function konteksStrategis(): BelongsTo
    {
        return $this->belongsTo(KonteksPenilaian::class, 'konteks_penilaian_id');
    }

    /**
     * Semua item Program, Kegiatan, dan Sub-Kegiatan.
     */
    public function items(): HasMany
    {
        return $this->hasMany(KonteksOperasionalItem::class, 'konteks_operasional_id')->orderBy('urutan', 'asc');
    }

    /**
     * Hanya item Program (akar hierarki level 1).
     */
    public function programs(): HasMany
    {
        return $this->hasMany(KonteksOperasionalItem::class, 'konteks_operasional_id')
            ->where('jenis', 'program')
            ->orderBy('urutan', 'asc');
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
                        ->orWhereHas('opd', fn ($opdQuery) => $opdQuery->where('nama', 'ilike', "%{$search}%")->orWhere('kode', 'ilike', "%{$search}%"));
                });
            });
    }
}
