<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use App\Models\Master\MasterUrusanPemerintahan;
use App\Models\Opd;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\User;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IdentifikasiRisikoOpdOperasional extends Model
{
    use Auditable, HasFactory, HasUuid7;

    protected $table = 'identifikasi_risiko_opd_operasionals';

    public string $auditModule = 'Identifikasi Risiko Operasional OPD';

    protected $fillable = [
        'periode_penilaian_id',
        'opd_id',
        'master_urusan_pemerintahan_id',
        'nama_pemda',
        'singkatan_opd',
        'nama_kepala_opd',
        'nip_kepala_opd',
        'jabatan_kepala_opd',
        'status',
        'created_by',
        'updated_by',
    ];

    public function periode(): BelongsTo
    {
        return $this->belongsTo(PeriodePenilaian::class, 'periode_penilaian_id');
    }

    public function opd(): BelongsTo
    {
        return $this->belongsTo(Opd::class, 'opd_id');
    }

    public function urusanPemerintahan(): BelongsTo
    {
        return $this->belongsTo(MasterUrusanPemerintahan::class, 'master_urusan_pemerintahan_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(IdentifikasiRisikoOpdOperasionalItem::class, 'identifikasi_risiko_opd_operasional_id')
            ->orderBy('urutan', 'asc');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
