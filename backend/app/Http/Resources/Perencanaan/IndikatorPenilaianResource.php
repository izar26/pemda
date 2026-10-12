<?php

declare(strict_types=1);

namespace App\Http\Resources\Perencanaan;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Perencanaan\IndikatorPenilaian
 */
class IndikatorPenilaianResource extends JsonResource
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
            'tujuan_penilaian_id' => $this->tujuan_penilaian_id,
            'sasaran_penilaian_id' => $this->sasaran_penilaian_id,
            'kode_indikator' => $this->kode_indikator,
            'indikator' => $this->indikator,
            'jenis' => $this->jenis,
            'urutan' => $this->urutan,
            'keterangan' => $this->keterangan,
            'opd' => $this->whenLoaded('opd', function () {
                return [
                    'id' => $this->opd->id,
                    'nama' => $this->opd->nama,
                    'kode' => $this->opd->kode,
                    'kategori' => $this->opd->kategori,
                    'kepala' => $this->opd->kepala,
                ];
            }),
            'tujuan' => $this->whenLoaded('tujuan', function () {
                return [
                    'id' => $this->tujuan->id,
                    'kode_tujuan' => $this->tujuan->kode_tujuan,
                    'tujuan' => $this->tujuan->tujuan,
                ];
            }),
            'sasaran' => $this->whenLoaded('sasaran', function () {
                return [
                    'id' => $this->sasaran->id,
                    'kode_sasaran' => $this->sasaran->kode_sasaran,
                    'sasaran' => $this->sasaran->sasaran,
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
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
