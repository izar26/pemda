<?php

declare(strict_types=1);

namespace App\Http\Resources\Risiko;

use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin IdentifikasiRisikoOpdOperasionalItem
 */
class IdentifikasiRisikoOpdOperasionalItemResource extends JsonResource
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
            'identifikasi_risiko_opd_operasional_id' => $this->identifikasi_risiko_opd_operasional_id,
            'operasional_sub_kegiatan_id' => $this->operasional_sub_kegiatan_id,
            'sub_kegiatan_kustom' => $this->sub_kegiatan_kustom,
            'resolved_program' => $this->resolved_program,
            'resolved_kegiatan' => $this->resolved_kegiatan,
            'resolved_sub_kegiatan' => $this->resolved_sub_kegiatan,
            'indikator_keluaran_kustom' => $this->indikator_keluaran_kustom,
            'resolved_indikator' => $this->resolved_indikator,
            'probis' => $this->probis,
            'kategori_risiko' => $this->kategori_risiko,
            'nomor_urut' => $this->nomor_urut,
            'pernyataan_risiko' => $this->pernyataan_risiko,
            'kode_risiko' => $this->kode_risiko,
            'pemilik_risiko' => $this->pemilik_risiko,
            'sifat_risiko' => $this->sifat_risiko,
            'uraian_dampak' => $this->uraian_dampak,
            'pihak_terkena' => $this->pihak_terkena,
            'urutan' => $this->urutan,
            // RCA Data connection
            'uraian_sebab' => $this->rca?->akar_penyebab,
            'sumber_risiko' => $this->rca?->jenis_penyebab,
            'kegiatan_pengendalian' => $this->rca?->kegiatan_pengendalian,
            'has_rca' => ! empty($this->rca?->akar_penyebab) && ! empty($this->rca?->jenis_penyebab),
            'rca' => $this->whenLoaded('rca', function () {
                return new RootCauseAnalysisResource($this->rca);
            }),
            'sub_kegiatan' => $this->whenLoaded('subKegiatan', function () {
                return [
                    'id' => $this->subKegiatan->id,
                    'kode' => $this->subKegiatan->kode,
                    'nama' => $this->subKegiatan->nama,
                    'jenis' => $this->subKegiatan->jenis,
                ];
            }),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
