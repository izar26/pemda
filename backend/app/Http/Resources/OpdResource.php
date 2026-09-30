<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Opd;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Opd
 */
class OpdResource extends JsonResource
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
            'nama' => $this->nama,
            'kode' => $this->kode,
            'kategori' => $this->kategori,
            'kepala' => $this->kepala,
            'urutan' => $this->urutan,
            'is_active' => $this->is_active,
            'users_count' => $this->whenCounted('users', $this->users_count, 0),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
