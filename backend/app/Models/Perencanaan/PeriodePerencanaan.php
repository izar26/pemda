<?php

declare(strict_types=1);

namespace App\Models\Perencanaan;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PeriodePerencanaan extends Model
{
    use Auditable, HasFactory, HasUuids;

    protected $table = 'periode_perencanaans';

    public string $auditModule = 'Perencanaan Kinerja';

    protected $fillable = [
        'nama',
        'tahun_mulai',
        'tahun_selesai',
        'durasi_tahun',
        'status',
        'keterangan',
    ];

    protected $casts = [
        'tahun_mulai' => 'integer',
        'tahun_selesai' => 'integer',
        'durasi_tahun' => 'integer',
    ];

    protected $appends = [
        'rentang_tahun',
        'tahun_aktif',
    ];

    public function getRentangTahunAttribute(): string
    {
        return "{$this->tahun_mulai}-{$this->tahun_selesai}";
    }

    public function getTahunAktifAttribute(): ?int
    {
        $activeChild = $this->tahunPenilaians->firstWhere('status', 'active');
        return $activeChild ? (int) $activeChild->tahun : null;
    }

    /**
     * Get all evaluation years under this planning cycle.
     */
    public function tahunPenilaians(): HasMany
    {
        return $this->hasMany(PeriodePenilaian::class, 'periode_perencanaan_id')->orderBy('tahun', 'asc');
    }

    /**
     * Get the active evaluation year for this cycle.
     */
    public function activeTahun(): HasOne
    {
        return $this->hasOne(PeriodePenilaian::class, 'periode_perencanaan_id')->where('status', 'active');
    }
}
