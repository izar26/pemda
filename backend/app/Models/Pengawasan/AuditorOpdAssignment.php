<?php

declare(strict_types=1);

namespace App\Models\Pengawasan;

use App\Models\Concerns\HasUuid7;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditorOpdAssignment extends Model
{
    use Auditable, HasFactory, HasUuid7;

    protected $table = 'auditor_opd_assignments';

    public string $auditModule = 'Penugasan Auditor';

    protected $fillable = [
        'auditor_id',
        'opd_id',
        'periode_penilaian_id',
        'assigned_by',
        'nomor_surat_tugas',
        'tanggal_mulai',
        'tanggal_selesai',
        'catatan',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'tanggal_mulai' => 'date',
            'tanggal_selesai' => 'date',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function auditor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'auditor_id');
    }

    /**
     * @return BelongsTo<Opd, $this>
     */
    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }

    /**
     * @return BelongsTo<PeriodePenilaian, $this>
     */
    public function periodePenilaian(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * Scope only active assignments.
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
