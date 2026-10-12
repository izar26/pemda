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

class IndikatorPenilaian extends Model
{
    use Auditable, HasFactory, HasUuid7;

    protected $table = 'indikator_penilaians';

    /**
     * Audit module identifier for AuditLogService.
     */
    public string $auditModule = 'Perencanaan Kinerja';

    protected $fillable = [
        'periode_penilaian_id',
        'opd_id',
        'tujuan_penilaian_id',
        'sasaran_penilaian_id',
        'kode_indikator',
        'indikator',
        'jenis',
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
     * Relasi ke Tujuan Renstra OPD.
     *
     * @return BelongsTo<TujuanPenilaian, self>
     */
    public function tujuan(): BelongsTo
    {
        return $this->belongsTo(TujuanPenilaian::class, 'tujuan_penilaian_id');
    }

    /**
     * Relasi ke Sasaran Renstra OPD.
     *
     * @return BelongsTo<SasaranPenilaian, self>
     */
    public function sasaran(): BelongsTo
    {
        return $this->belongsTo(SasaranPenilaian::class, 'sasaran_penilaian_id');
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
     * Scope query khusus Indikator Kinerja Utama (IKU).
     *
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopeIku(Builder $query): Builder
    {
        return $query->where('jenis', 'IKU');
    }

    /**
     * Scope query khusus Indikator Renstra Biasa.
     *
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopeBiasa(Builder $query): Builder
    {
        return $query->where('jenis', 'Biasa');
    }

    /**
     * Scope query untuk filter pencarian, OPD, Sasaran, Tujuan, Periode, dan Jenis.
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
                $q->where('indikator', 'ilike', "%{$search}%")
                    ->orWhere('kode_indikator', 'ilike', "%{$search}%")
                    ->orWhereHas('opd', function (Builder $opdQ) use ($search) {
                        $opdQ->where('nama', 'ilike', "%{$search}%")
                            ->orWhere('kode', 'ilike', "%{$search}%");
                    })
                    ->orWhereHas('sasaran', function (Builder $sasQ) use ($search) {
                        $sasQ->where('sasaran', 'ilike', "%{$search}%")
                            ->orWhere('kode_sasaran', 'ilike', "%{$search}%");
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

        if (!empty($filters['sasaran_penilaian_id']) && $filters['sasaran_penilaian_id'] !== 'all') {
            $query->where('sasaran_penilaian_id', $filters['sasaran_penilaian_id']);
        }

        if (!empty($filters['jenis']) && $filters['jenis'] !== 'all') {
            $query->where('jenis', $filters['jenis']);
        }

        return $query;
    }
}
