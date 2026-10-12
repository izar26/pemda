<?php

declare(strict_types=1);

namespace App\Http\Resources\Risiko;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Risiko\KonteksOperasionalItem
 */
class KonteksOperasionalItemResource extends JsonResource
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
            'konteks_operasional_id' => $this->konteks_operasional_id,
            'parent_id' => $this->parent_id,
            'jenis' => $this->jenis,
            'kode' => $this->kode,
            'nama' => $this->nama,
            'urutan' => $this->urutan,
            'indikators' => KonteksOperasionalIndikatorResource::collection($this->whenLoaded('indikators')),
            'children' => self::collection($this->whenLoaded('children')),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
