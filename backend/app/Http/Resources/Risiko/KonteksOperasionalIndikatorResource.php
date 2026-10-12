<?php

declare(strict_types=1);

namespace App\Http\Resources\Risiko;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Risiko\KonteksOperasionalIndikator
 */
class KonteksOperasionalIndikatorResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_id' => $this->item_id,
            'indikator' => $this->indikator,
            'target' => $this->target,
            'satuan' => $this->satuan,
            'urutan' => $this->urutan,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
