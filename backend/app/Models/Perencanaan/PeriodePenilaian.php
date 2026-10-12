<?php

declare(strict_types=1);

namespace App\Models\Perencanaan;

use App\Models\Concerns\HasUuid7;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
