<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid7;
use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\KonteksOperasional;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\Risiko\PengajuanPenilaianRisiko;
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
     * @return HasMany<IdentifikasiRisikoPemda, $this>
     */
    public function identifikasiRisikoPemdas(): HasMany
    {
        return $this->hasMany(IdentifikasiRisikoPemda::class, 'opd_id');
    }

    /**
     * @return HasMany<IdentifikasiRisikoOpd, $this>
     */
    public function identifikasiRisikoOpds(): HasMany
    {
        return $this->hasMany(IdentifikasiRisikoOpd::class, 'opd_id');
    }

    /**
     * @return HasMany<IdentifikasiRisikoOpdOperasional, $this>
     */
    public function identifikasiRisikoOperasionals(): HasMany
    {
        return $this->hasMany(Risiko\IdentifikasiRisikoOpdOperasional::class, 'opd_id');
    }

    /**
     * Get short code / abbreviation for OPD code generation (e.g. PUTR, DINKES, DISDIK).
     */
    public function getSingkatanAttribute(): string
    {
        $map = [
            'Dinas Pekerjaan Umum dan Penataan Ruang' => 'PUTR',
            'Dinas Pekerjaan Umum dan Tata Ruang' => 'PUTR',
            'Dinas Pendidikan, Pemuda dan Olahraga' => 'DISDIK',
            'Dinas Pendidikan' => 'DISDIK',
            'Dinas Kesehatan' => 'DINKES',
            'Inspektorat Daerah' => 'ITDA',
            'Inspektorat' => 'ITDA',
            'Sekretariat Daerah' => 'SETDA',
            'Sekretariat DPRD' => 'SETWAN',
            'Satuan Polisi Pamong Praja dan Pemadam Kebakaran' => 'SATPOL',
            'Badan Perencanaan Pembangunan Daerah' => 'BAPPEDA',
            'Badan Pendapatan Daerah' => 'BAPENDA',
            'Badan Pengelolaan Keuangan dan Aset Daerah' => 'BPKAD',
            'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia' => 'BKPSDM',
            'Dinas Sosial' => 'DINSOS',
            'Dinas Perhubungan' => 'DISHUB',
            'Dinas Kependudukan dan Pencatatan Sipil' => 'DISDUKCAPIL',
            'Dinas Komunikasi, Informatika dan Persandian' => 'DISKOMINFO',
            'Dinas Lingkungan Hidup' => 'DLH',
        ];

        if (isset($map[$this->nama])) {
            return $map[$this->nama];
        }

        foreach ($map as $key => $val) {
            if (stripos($this->nama, $key) !== false || stripos($key, $this->nama) !== false) {
                return $val;
            }
        }

        // Fallback: Acronym of significant words
        $words = preg_split('/\s+/', $this->nama) ?: [];
        $acronym = '';
        $stopWords = ['dan', 'yang', 'untuk', 'pada', 'di', 'ke', 'dari'];
        foreach ($words as $word) {
            $lower = strtolower($word);
            if (! in_array($lower, $stopWords, true) && strlen($word) > 0) {
                $acronym .= strtoupper($word[0]);
            }
        }

        return ! empty($acronym) ? substr($acronym, 0, 6) : 'OPD';
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
     * @return HasMany<PengajuanPenilaianRisiko, $this>
     */
    public function pengajuanRisiko(): HasMany
    {
        return $this->hasMany(PengajuanPenilaianRisiko::class, 'opd_id');
    }
}
