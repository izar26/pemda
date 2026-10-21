<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid7;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Opd extends Model
{
    use Auditable, HasFactory, HasUuid7;

    protected $table = 'opds';

    protected $fillable = [
        'nama',
        'kode',
        'kategori',
        'kepala',
        'is_active',
        'urutan',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'urutan' => 'integer',
    ];

    /**
     * Get employees assigned to this OPD.
     *
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'opd_id');
    }

    /**
     * @return HasMany<TujuanPenilaian, $this>
     */
    public function tujuanPenilaians(): HasMany
    {
        return $this->hasMany(TujuanPenilaian::class, 'opd_id');
    }

    /**
     * @return HasMany<SasaranPenilaian, $this>
     */
    public function sasaranPenilaians(): HasMany
    {
        return $this->hasMany(SasaranPenilaian::class, 'opd_id');
    }

    /**
     * @return HasMany<IndikatorPenilaian, $this>
     */
    public function indikatorPenilaians(): HasMany
    {
        return $this->hasMany(IndikatorPenilaian::class, 'opd_id');
    }

    /**
     * @return HasMany<KonteksPenilaian, $this>
     */
    public function konteksPenilaians(): HasMany
    {
        return $this->hasMany(KonteksPenilaian::class, 'opd_id');
    }

    /**
     * @return HasMany<KonteksOperasional, $this>
     */
    public function konteksOperasionals(): HasMany
    {
        return $this->hasMany(KonteksOperasional::class, 'opd_id');
    }

    /**
     * @return HasMany<AuditorOpdAssignment, $this>
     */
    public function auditorAssignments(): HasMany
    {
        return $this->hasMany(AuditorOpdAssignment::class, 'opd_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function assignedAuditors(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'auditor_opd_assignments', 'opd_id', 'auditor_id')
            ->withPivot(['id', 'periode_penilaian_id', 'nomor_surat_tugas', 'tanggal_mulai', 'tanggal_selesai', 'catatan', 'is_active'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<\App\Models\Risiko\PengajuanPenilaianRisiko, $this>
     */
    public function pengajuanRisiko(): HasMany
    {
        return $this->hasMany(\App\Models\Risiko\PengajuanPenilaianRisiko::class, 'opd_id');
    }
}

