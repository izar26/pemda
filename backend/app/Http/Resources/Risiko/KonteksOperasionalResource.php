<?php

declare(strict_types=1);

namespace App\Http\Resources\Risiko;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Risiko\KonteksOperasional
 */
class KonteksOperasionalResource extends JsonResource
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
            'nama_pemda' => $this->nama_pemda,
            'informasi_lain' => $this->informasi_lain,
            'nama_kepala' => $this->nama_kepala,
            'nip_kepala' => $this->nip_kepala,
            'jabatan_kepala' => $this->jabatan_kepala,
            'tanggal_penetapan' => $this->tanggal_penetapan?->format('Y-m-d'),
            'status' => $this->status,
            'periode' => $this->whenLoaded('periode', function () {
                return [
                    'id' => $this->periode->id,
                    'nama_periode' => $this->periode->nama_periode,
                    'tahun_penilaian' => $this->periode->tahun_penilaian,
                    'rentang_tahun' => $this->periode->rentang_tahun,
                    'status' => $this->periode->status,
                ];
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
            'sumber_data' => $this->whenLoaded('sumberData', function () {
                return [
                    'id' => $this->sumberData->id,
                    'nama' => $this->sumberData->nama,
                ];
            }),
            // Tujuan Strategis (diambil dari Form 2B yang telah ditetapkan)
            'tujuan_strategis' => $this->whenLoaded('konteksStrategis', function () {
                $tujuan = $this->konteksStrategis?->tujuan;
                return $tujuan ? [
                    'id' => $tujuan->id,
                    'kode_tujuan' => $tujuan->kode_tujuan,
                    'tujuan' => $tujuan->tujuan,
                ] : null;
            }),
            // Hierarki items bertingkat (Program -> Kegiatan -> Sub Kegiatan)
            'items' => KonteksOperasionalItemResource::collection($this->whenLoaded('items')),
            'programs' => KonteksOperasionalItemResource::collection($this->whenLoaded('programs')),
            'creator' => $this->whenLoaded('creator', function () {
                return [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                ];
            }),
            'updater' => $this->whenLoaded('updater', function () {
                return [
                    'id' => $this->updater->id,
                    'name' => $this->updater->name,
                ];
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
