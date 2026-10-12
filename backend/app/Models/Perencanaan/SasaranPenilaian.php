<?php

declare(strict_types=1);

namespace App\Models\Perencanaan;

use App\Models\Concerns\HasUuid7;
use App\Models\Opd;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SasaranPenilaian extends Model
{
    use Auditable, HasFactory, HasUuid7;

    protected $table = 'sasaran_penilaians';

    /**
     * Audit module identifier for AuditLogService.
     */
    public string $auditModule = 'Perencanaan Kinerja';

    protected $fillable = [
        'periode_penilaian_id',
        'tujuan_penilaian_id',
        'opd_id',
        'kode_sasaran',
        'sasaran',
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
     * Relasi ke Tujuan Penilaian Renstra OPD.
     *
     * @return BelongsTo<TujuanPenilaian, self>
     */
    public function tujuan(): BelongsTo
    {
        return $this->belongsTo(TujuanPenilaian::class, 'tujuan_penilaian_id');
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
     * Relasi ke pengguna pembuat data (Audit).
     *
     * @return BelongsTo<User, self>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relasi ke Indikator Kinerja / IKU Renstra OPD.
     *
     * @return \Illuminate\Database\Eloquent\Relations\HasMany<IndikatorPenilaian, self>
     */
    public function indikators(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(IndikatorPenilaian::class, 'sasaran_penilaian_id');
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
     * Scope query untuk filter pencarian, OPD, Tujuan, dan Periode.
     *
     * @param Builder<self> $query
     * @param array<string, mixed> $filters
     * @return Builder<self>
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        if (!empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            $query->where(function (Builder $q) use ($search) {
                $q->where('sasaran', 'ilike', "%{$search}%")
                    ->orWhere('kode_sasaran', 'ilike', "%{$search}%")
                    ->orWhereHas('opd', function (Builder $opdQ) use ($search) {
                        $opdQ->where('nama', 'ilike', "%{$search}%")
                            ->orWhere('kode', 'ilike', "%{$search}%");
                    })
                    ->orWhereHas('tujuan', function (Builder $tujQ) use ($search) {
                        $tujQ->where('tujuan', 'ilike', "%{$search}%")
                            ->orWhere('kode_tujuan', 'ilike', "%{$search}%");
                    });
            });
        }

        if (!empty($filters['periode_penilaian_id'])) {
            $query->where('periode_penilaian_id', $filters['periode_penilaian_id']);
        }

        if (!empty($filters['opd_id']) && $filters['opd_id'] !== 'all') {
            $query->where('opd_id', $filters['opd_id']);
        }

        if (!empty($filters['tujuan_penilaian_id']) && $filters['tujuan_penilaian_id'] !== 'all') {
            $query->where('tujuan_penilaian_id', $filters['tujuan_penilaian_id']);
        }

        return $query;
    }
}
