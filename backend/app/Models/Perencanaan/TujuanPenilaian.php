<?php

declare(strict_types=1);

namespace App\Models\Perencanaan;

use App\Models\Concerns\HasUuid7;
use App\Models\Master\MasterSumberData;
use App\Models\Opd;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TujuanPenilaian extends Model
{
    use Auditable, HasFactory, HasUuid7;

    protected $table = 'tujuan_penilaians';

    /**
     * Audit module identifier for AuditLogService.
     */
    public string $auditModule = 'Perencanaan Kinerja';

    protected $fillable = [
        'periode_penilaian_id',
        'opd_id',
        'sumber_data_id',
        'kode_tujuan',
        'tujuan',
        'urutan',
        'keterangan',
        'created_by',
    ];

    protected $casts = [
        'urutan' => 'integer',
    ];

    /**
     * Relasi ke Periode Penilaian (RPJMD).
     *
     * @return BelongsTo<PeriodePenilaian, self>
     */
    public function periode(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
    }

    /**
     * Relasi ke Perangkat Daerah (OPD).
     *
     * @return BelongsTo<Opd, self>
     */
    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }

    /**
     * Relasi ke Master Sumber Data.
     *
     * @return BelongsTo<MasterSumberData, self>
     */
    public function sumberData(): BelongsTo
    {
        return $this->belongsTo(MasterSumberData::class, 'sumber_data_id');
    }

    /**
     * Relasi ke pengguna pembuat data (Audit).
     *
     * @return BelongsTo<User, self>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relasi ke Sasaran Penilaian (Fitur 15).
     *
     * @return HasMany<SasaranPenilaian, self>
     */
    public function sasarans(): HasMany
    {
        return $this->hasMany(SasaranPenilaian::class, 'tujuan_penilaian_id')->orderBy('urutan', 'asc');
    }

    /**
     * Relasi ke Indikator Penilaian.
     *
     * @return HasMany<IndikatorPenilaian, self>
     */
    public function indikators(): HasMany
    {
        return $this->hasMany(IndikatorPenilaian::class, 'tujuan_penilaian_id');
    }

    /**
     * Relasi ke Konteks Penilaian (Form 2B).
     *
     * @return HasMany<KonteksPenilaian, self>
     */
    public function konteksPenilaians(): HasMany
    {
        return $this->hasMany(KonteksPenilaian::class, 'tujuan_penilaian_id');
    }

    /**
     * Scope query ke periode yang aktif saat ini.
     *
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopeForActivePeriode(Builder $query): Builder
    {
        return $query->whereHas('periode', function (Builder $q) {
            $q->where('status', 'aktif');
        });
    }

    /**
     * Scope query untuk filter pencarian, OPD, dan periode.
     *
     * @param Builder<self> $query
     * @param array<string, mixed> $filters
     * @return Builder<self>
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        if (!empty($filters['search'])) {
            $search = strtolower(trim((string) $filters['search']));
            $like = "%{$search}%";
            $query->where(function (Builder $q) use ($like) {
                $q->whereRaw('LOWER(tujuan) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(kode_tujuan, \'\')) LIKE ?', [$like])
                    ->orWhereHas('opd', function (Builder $opdQ) use ($like) {
                        $opdQ->whereRaw('LOWER(nama) LIKE ?', [$like])
                            ->orWhereRaw('LOWER(kode) LIKE ?', [$like]);
                    })
                    ->orWhereHas('sumberData', function (Builder $sdQ) use ($like) {
                        $sdQ->whereRaw('LOWER(nama) LIKE ?', [$like]);
                    })
                    ->orWhereHas('sasarans', function (Builder $sasQ) use ($like) {
                        $sasQ->whereRaw('LOWER(sasaran) LIKE ?', [$like])
                            ->orWhereHas('indikators', function (Builder $indQ) use ($like) {
                                $indQ->whereRaw('LOWER(indikator) LIKE ?', [$like]);
                            });
                    });
            });
        }

        if (!empty($filters['periode_penilaian_id'])) {
            $query->where('periode_penilaian_id', $filters['periode_penilaian_id']);
        }

        if (!empty($filters['opd_id']) && $filters['opd_id'] !== 'all') {
            $query->where('opd_id', $filters['opd_id']);
        }

        if (!empty($filters['sumber_data_id']) && $filters['sumber_data_id'] !== 'all') {
            $query->where('sumber_data_id', $filters['sumber_data_id']);
        }

        return $query;
    }
}

