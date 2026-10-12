<?php

declare(strict_types=1);

namespace App\Http\Resources\Risiko;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Risiko\KonteksPenilaian
 */
class KonteksPenilaianResource extends JsonResource
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
            'tujuan_penilaian_id' => $this->tujuan_penilaian_id,
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
            'tujuan' => $this->whenLoaded('tujuan', function () {
                return [
                    'id' => $this->tujuan->id,
                    'kode_tujuan' => $this->tujuan->kode_tujuan,
                    'tujuan' => $this->tujuan->tujuan,
                    'urutan' => $this->tujuan->urutan,
                ];
            }),
            'sasarans' => $this->whenLoaded('sasarans', function () {
                return $this->sasarans->map(function ($sasaran) {
                    return [
                        'id' => $sasaran->id,
                        'kode_sasaran' => $sasaran->kode_sasaran,
                        'sasaran' => $sasaran->sasaran,
                        'urutan' => $sasaran->pivot?->urutan ?? $sasaran->urutan,
                    ];
                });
            }),
            'indikators' => $this->whenLoaded('indikators', function () {
                return $this->indikators->map(function ($indikator) {
                    return [
                        'id' => $indikator->id,
                        'sasaran_penilaian_id' => $indikator->sasaran_penilaian_id,
                        'kode_indikator' => $indikator->kode_indikator,
                        'indikator' => $indikator->indikator,
                        'jenis' => $indikator->jenis,
                        'urutan' => $indikator->pivot?->urutan ?? $indikator->urutan,
                    ];
                });
            }),
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
