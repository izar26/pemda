<?php

declare(strict_types=1);

namespace App\Models\Risiko;

use App\Models\Concerns\HasUuid7;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KonteksOperasionalIndikator extends Model
{
    use HasFactory, HasUuid7;

    protected $table = 'konteks_operasional_indikators';

    protected $fillable = [
        'item_id',
        'indikator',
        'target',
        'satuan',
        'urutan',
    ];

    public function item(): BelongsTo
    {
        return $this->belongsTo(KonteksOperasionalItem::class, 'item_id');
    }
}
