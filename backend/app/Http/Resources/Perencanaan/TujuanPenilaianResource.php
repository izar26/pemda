<?php

declare(strict_types=1);

namespace App\Http\Resources\Perencanaan;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Perencanaan\TujuanPenilaian
 */
class TujuanPenilaianResource extends JsonResource
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
            'sumber_data_id' => $this->sumber_data_id,
            'kode_tujuan' => $this->kode_tujuan,
            'tujuan' => $this->tujuan,
            'urutan' => $this->urutan,
            'keterangan' => $this->keterangan,
            'sumber_data' => $this->whenLoaded('sumberData', function () {
                return $this->sumberData ? [
                    'id' => $this->sumberData->id,
                    'nama' => $this->sumberData->nama,
                    'deskripsi' => $this->sumberData->deskripsi,
                ] : null;
            }),
            'opd' => $this->whenLoaded('opd', function () {
                return [
                    'id' => $this->opd->id,
                    'nama' => $this->opd->nama,
                    'kode' => $this->opd->kode,
                    'kategori' => $this->opd->kategori,
                    'kepala' => $this->opd->kepala,
                ];
            }),
            'periode' => $this->whenLoaded('periode', function () {
                return [
                    'id' => $this->periode->id,
                    'nama_periode' => $this->periode->nama_periode,
                    'tahun_penilaian' => $this->periode->tahun_penilaian,
                    'rentang_tahun' => "{$this->periode->tahun_mulai} - {$this->periode->tahun_akhir}",
                    'status' => $this->periode->status,
                ];
            }),
            'creator' => $this->whenLoaded('creator', function () {
                return $this->creator ? [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                ] : null;
            }),
            'sasaran_count' => $this->sasarans_count ?? $this->sasarans()->count(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
