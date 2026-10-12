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
            $search = trim((string) $filters['search']);
            $query->where(function (Builder $q) use ($search) {
                $q->where('tujuan', 'ilike', "%{$search}%")
                    ->orWhere('kode_tujuan', 'ilike', "%{$search}%")
                    ->orWhereHas('opd', function (Builder $opdQ) use ($search) {
                        $opdQ->where('nama', 'ilike', "%{$search}%")
                            ->orWhere('kode', 'ilike', "%{$search}%");
                    });
            });
        }

        if (!empty($filters['periode_penilaian_id'])) {
            $query->where('periode_penilaian_id', $filters['periode_penilaian_id']);
        }

        if (!empty($filters['opd_id']) && $filters['opd_id'] !== 'all') {
            $query->where('opd_id', $filters['opd_id']);
        }

        return $query;
    }
}
