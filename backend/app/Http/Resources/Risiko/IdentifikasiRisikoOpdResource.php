<?php

declare(strict_types=1);

namespace App\Http\Resources\Risiko;

use App\Models\Risiko\IdentifikasiRisikoOpd;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin IdentifikasiRisikoOpd
 */
class IdentifikasiRisikoOpdResource extends JsonResource
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
            'periode_penilaian_id' => $this->periode_penilaian_id,
            'opd_id' => $this->opd_id,
            'master_urusan_pemerintahan_id' => $this->master_urusan_pemerintahan_id,
            'nama_pemda' => $this->nama_pemda,
            'singkatan_opd' => $this->singkatan_opd ?: ($this->opd?->singkatan ?: 'OPD'),
            'nama_kepala_opd' => $this->nama_kepala_opd,
            'status' => $this->status,
            'periode' => $this->whenLoaded('periode', function () {
                return [
                    'id' => $this->periode->id,
                    'nama_periode' => $this->periode->nama_periode,
                    'tahun_penilaian' => $this->periode->tahun_penilaian,
                    'tahun_mulai' => $this->periode->tahun_mulai,
                    'tahun_selesai' => $this->periode->tahun_selesai,
                ];
            }),
            'opd' => $this->whenLoaded('opd', function () {
                return [
                    'id' => $this->opd->id,
                    'nama' => $this->opd->nama,
                    'kode' => $this->opd->kode,
                    'kepala' => $this->opd->kepala,
                    'singkatan' => $this->opd->singkatan,
                ];
            }),
            'urusan_pemerintahan' => $this->whenLoaded('urusanPemerintahan', function () {
                return [
                    'id' => $this->urusanPemerintahan->id,
                    'kode' => $this->urusanPemerintahan->kode,
                    'nama' => $this->urusanPemerintahan->nama,
                ];
            }),
            'items' => IdentifikasiRisikoOpdItemResource::collection($this->whenLoaded('items')),
            'items_count' => $this->items()->count(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
