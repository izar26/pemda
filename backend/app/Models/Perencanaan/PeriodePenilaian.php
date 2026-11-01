<?php

declare(strict_types=1);

namespace App\Models\Perencanaan;

use App\Models\Concerns\HasUuid7;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PeriodePenilaian extends Model
{
    use Auditable, HasFactory, HasUuid7;

    protected $table = 'periode_penilaians';

    /**
     * Audit module identifier for AuditLogService.
     */
    public string $auditModule = 'Perencanaan Kinerja';

    protected $fillable = [
        'nama_periode',
        'tahun_mulai',
        'tahun_akhir',
        'tahun_penilaian',
        'tanggal_mulai',
        'tanggal_akhir',
        'status',
        'keterangan',
        'created_by',
    ];

    protected $casts = [
        'tahun_mulai' => 'integer',
        'tahun_akhir' => 'integer',
        'tahun_penilaian' => 'integer',
        'tanggal_mulai' => 'date:Y-m-d',
        'tanggal_akhir' => 'date:Y-m-d',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'rentang_tahun',
    ];

    /**
     * Get formatted range of years (e.g. "2026 - 2030").
     */
    public function getRentangTahunAttribute(): string
    {
        if ($this->tahun_mulai && $this->tahun_akhir) {
            return "{$this->tahun_mulai} - {$this->tahun_akhir}";
        }

        return (string) ($this->nama_periode ?: '-');
    }

    /**
     * Scope query to only currently active period.
     *
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopeAktif(Builder $query): Builder
    {
        return $query->where('status', 'aktif');
    }

    /**
     * Scope query to filter periods.
     *
     * @param Builder<self> $query
     * @param array<string, mixed> $filters
     * @return Builder<self>
     */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        if (!empty($filters['search'])) {
            $term = trim((string) $filters['search']);
            $query->where(function (Builder $q) use ($term) {
                $q->where('nama_periode', 'like', "%{$term}%")
                    ->orWhere('tahun_penilaian', 'like', "%{$term}%")
                    ->orWhere('keterangan', 'like', "%{$term}%");
            });
        }

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['tahun_penilaian']) && $filters['tahun_penilaian'] !== 'all') {
            $query->where('tahun_penilaian', (int) $filters['tahun_penilaian']);
        }

        return $query;
    }

    /**
     * Get user who created this period.
     *
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<TujuanPenilaian, $this>
     */
    public function tujuanPenilaians(): HasMany
    {
        return $this->hasMany(TujuanPenilaian::class, 'periode_penilaian_id');
    }

    /**
     * @return HasMany<SasaranPenilaian, $this>
     */
    public function sasaranPenilaians(): HasMany
    {
        return $this->hasMany(SasaranPenilaian::class, 'periode_penilaian_id');
    }

    /**
     * @return HasMany<IndikatorPenilaian, $this>
     */
    public function indikatorPenilaians(): HasMany
    {
        return $this->hasMany(IndikatorPenilaian::class, 'periode_penilaian_id');
    }

    /**
     * @return HasMany<KonteksPenilaian, $this>
     */
    public function konteksPenilaians(): HasMany
    {
        return $this->hasMany(KonteksPenilaian::class, 'periode_penilaian_id');
    }

    /**
     * @return HasMany<KonteksOperasional, $this>
     */
    public function konteksOperasionals(): HasMany
    {
        return $this->hasMany(KonteksOperasional::class, 'periode_penilaian_id');
    }

    /**
     * @return HasMany<PengajuanPenilaianRisiko, $this>
     */
    public function pengajuanPenilaians(): HasMany
    {
        return $this->hasMany(PengajuanPenilaianRisiko::class, 'periode_penilaian_id');
    }

    /**
     * Check if this period has any actual Risk Management transactions filled by OPD
     * (Form 2B Konteks Strategis, Form 2C Konteks Operasional, or non-draft Submissions).
     */
    public function hasRisikoTransactions(): bool
    {
        return $this->getRisikoTransactionsCount() > 0;
    }

    /**
     * Get total count of Risk Management transactions filled by OPD.
     */
    public function getRisikoTransactionsCount(): int
    {
        $konteksStrategis = (int) ($this->konteks_penilaians_count ?? $this->konteksPenilaians()->count());
        $konteksOperasional = (int) ($this->konteks_operasionals_count ?? $this->konteksOperasionals()->count());
        $activePengajuan = (int) ($this->active_pengajuan_penilaians_count ?? $this->pengajuanPenilaians()
            ->where(function ($q) {
                $q->where('status', '!=', 'draft')
                  ->orWhereNotNull('submitted_at');
            })->count());

        return $konteksStrategis + $konteksOperasional + $activePengajuan;
    }

    /**
     * Get detailed Risk Management transaction counts.
     *
     * @return array{
     *     has_risiko_transactions: bool,
     *     total_risiko_transactions: int,
     *     konteks_strategis_count: int,
     *     konteks_operasional_count: int,
     *     active_pengajuan_count: int
     * }
     */
    public function getRisikoTransactionCounts(): array
    {
        $konteksStrategis = (int) ($this->konteks_penilaians_count ?? $this->konteksPenilaians()->count());
        $konteksOperasional = (int) ($this->konteks_operasionals_count ?? $this->konteksOperasionals()->count());
        $activePengajuan = (int) ($this->active_pengajuan_penilaians_count ?? $this->pengajuanPenilaians()
            ->where(function ($q) {
                $q->where('status', '!=', 'draft')
                  ->orWhereNotNull('submitted_at');
            })->count());

        $totalRisiko = $konteksStrategis + $konteksOperasional + $activePengajuan;

        return [
            'has_risiko_transactions' => $totalRisiko > 0,
            'total_risiko_transactions' => $totalRisiko,
            'konteks_strategis_count' => $konteksStrategis,
            'konteks_operasional_count' => $konteksOperasional,
            'active_pengajuan_count' => $activePengajuan,
        ];
    }

    /**
     * Alias for hasRisikoTransactions to enforce that only risk entries lock the evaluation year.
     */
    public function hasTransactions(): bool
    {
        return $this->hasRisikoTransactions();
    }

    /**
     * Get detailed transaction counts for this evaluation period, distinguishing between
     * Risk Management entries (which lock evaluation year) and Planning entries (Renstra OPD).
     *
     * @return array{
     *     has_transactions: bool,
     *     total_transactions: int,
     *     has_risiko_transactions: bool,
     *     total_risiko_transactions: int,
     *     tujuan_count: int,
     *     sasaran_count: int,
     *     indikator_count: int,
     *     konteks_strategis_count: int,
     *     konteks_operasional_count: int,
     *     pengajuan_count: int,
     *     active_pengajuan_count: int
     * }
     */
    public function getTransactionCounts(): array
    {
        $tujuan = (int) ($this->tujuan_penilaians_count ?? $this->tujuanPenilaians()->count());
        $sasaran = (int) ($this->sasaran_penilaians_count ?? $this->sasaranPenilaians()->count());
        $indikator = (int) ($this->indikator_penilaians_count ?? $this->indikatorPenilaians()->count());
        $konteksStrategis = (int) ($this->konteks_penilaians_count ?? $this->konteksPenilaians()->count());
        $konteksOperasional = (int) ($this->konteks_operasionals_count ?? $this->konteksOperasionals()->count());
        $totalPengajuan = (int) ($this->pengajuan_penilaians_count ?? $this->pengajuanPenilaians()->count());
        $activePengajuan = (int) ($this->active_pengajuan_penilaians_count ?? $this->pengajuanPenilaians()
            ->where(function ($q) {
                $q->where('status', '!=', 'draft')
                  ->orWhereNotNull('submitted_at');
            })->count());

        $totalRisiko = $konteksStrategis + $konteksOperasional + $activePengajuan;
        $totalAll = $tujuan + $sasaran + $indikator + $konteksStrategis + $konteksOperasional + $totalPengajuan;

        return [
            'has_transactions' => $totalRisiko > 0,
            'total_transactions' => $totalRisiko,
            'has_risiko_transactions' => $totalRisiko > 0,
            'total_risiko_transactions' => $totalRisiko,
            'tujuan_count' => $tujuan,
            'sasaran_count' => $sasaran,
            'indikator_count' => $indikator,
            'konteks_strategis_count' => $konteksStrategis,
            'konteks_operasional_count' => $konteksOperasional,
            'pengajuan_count' => $totalPengajuan,
            'active_pengajuan_count' => $activePengajuan,
            'has_any_data' => $totalAll > 0,
            'total_any_data' => $totalAll,
        ];
    }

    /**
     * Check if this period is currently active.
     */
    public function isAktif(): bool
    {
        return $this->status === 'aktif';
    }

    /**
     * Get the currently active period, or abort with a clean 422 JSON message.
     * Prevents 500 Null Pointer Exception across the system when no active period is set.
     */
    public static function getActiveOrThrow(): self
    {
        $active = self::where('status', 'aktif')->first();

        if (!$active) {
            abort(422, 'Tidak ada periode penilaian yang aktif saat ini. Silakan hubungi Administrator atau Bapperida untuk mengaktifkan periode penilaian.');
        }

        return $active;
    }
}

