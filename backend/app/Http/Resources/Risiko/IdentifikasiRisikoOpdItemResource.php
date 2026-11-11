<?php

declare(strict_types=1);

namespace App\Http\Resources\Risiko;

use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin IdentifikasiRisikoOpdItem
 */
class IdentifikasiRisikoOpdItemResource extends JsonResource
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
            'identifikasi_risiko_opd_id' => $this->identifikasi_risiko_opd_id,
            'sasaran_penilaian_id' => $this->sasaran_penilaian_id,
            'sasaran_kustom' => $this->sasaran_kustom,
            'resolved_sasaran' => $this->resolved_sasaran,
            'indikator_penilaian_id' => $this->indikator_penilaian_id,
            'indikator_kustom' => $this->indikator_kustom,
            'resolved_indikator' => $this->resolved_indikator,
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
            'sasaran' => $this->whenLoaded('sasaran', function () {
                return [
                    'id' => $this->sasaran->id,
                    'kode_sasaran' => $this->sasaran->kode_sasaran,
                    'sasaran' => $this->sasaran->sasaran,
                ];
            }),
            'indikator' => $this->whenLoaded('indikator', function () {
                return [
                    'id' => $this->indikator->id,
                    'kode_indikator' => $this->indikator->kode_indikator,
                    'indikator' => $this->indikator->indikator,
                ];
            }),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
