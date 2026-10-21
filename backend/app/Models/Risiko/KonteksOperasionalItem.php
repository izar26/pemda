<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class KonteksOperasionalItem extends Model
{
    use Auditable, HasFactory, HasUuid7;

    protected $table = 'konteks_operasional_items';

    protected $fillable = [
        'konteks_operasional_id',
        'parent_id',
        'jenis',
        'kode',
        'nama',
        'urutan',
    ];

    public function konteks(): BelongsTo
    {
        return $this->belongsTo(KonteksOperasional::class, 'konteks_operasional_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('urutan', 'asc');
    }

    public function indikators(): HasMany
    {
        return $this->hasMany(KonteksOperasionalIndikator::class, 'item_id')->orderBy('urutan', 'asc');
    }
}
