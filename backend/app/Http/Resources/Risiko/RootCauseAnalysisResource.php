<?php

declare(strict_types=1);

namespace App\Http\Resources\Risiko;

use App\Models\Risiko\RootCauseAnalysis;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin RootCauseAnalysis
 */
class RootCauseAnalysisResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $resolvedItem = match ($this->source_type) {
            '3c' => $this->relationLoaded('itemOperasional') ? $this->itemOperasional : null,
            '3b' => $this->relationLoaded('itemOpd') ? $this->itemOpd : null,
            default => $this->relationLoaded('itemPemda') ? $this->itemPemda : ($this->relationLoaded('item') ? $this->item : null),
        };

        return [
            'id' => $this->id,
            'source_type' => $this->source_type ?? '3a',
            'identifikasi_risiko_pemda_item_id' => $this->identifikasi_risiko_pemda_item_id,
            'identifikasi_risiko_opd_item_id' => $this->identifikasi_risiko_opd_item_id,
            'identifikasi_risiko_opd_operasional_item_id' => $this->identifikasi_risiko_opd_operasional_item_id,
            'why_1' => $this->why_1,
            'why_2' => $this->why_2,
            'why_3' => $this->why_3,
            'why_4' => $this->why_4,
            'why_5' => $this->why_5,
            'akar_penyebab' => $this->akar_penyebab,
            'jenis_penyebab' => $this->jenis_penyebab,
            'kegiatan_pengendalian' => $this->kegiatan_pengendalian,
            'item' => $resolvedItem ? [
                'id' => $resolvedItem->id,
                'nomor_urut' => $resolvedItem->nomor_urut,
                'kode_risiko' => $resolvedItem->kode_risiko,
                'pernyataan_risiko' => $resolvedItem->pernyataan_risiko,
                'kategori_risiko' => $resolvedItem->kategori_risiko,
                'pemilik_risiko' => $resolvedItem->pemilik_risiko,
                'sifat_risiko' => $resolvedItem->sifat_risiko,
                'uraian_dampak' => $resolvedItem->uraian_dampak,
                'pihak_terkena' => $resolvedItem->pihak_terkena,
                'probis' => $resolvedItem->probis ?? null,
                'sasaran' => $resolvedItem->resolved_sasaran ?? ($resolvedItem->resolved_sub_kegiatan ?? null),
                'indikator' => $resolvedItem->resolved_indikator ?? null,
                'program' => $resolvedItem->resolved_program ?? null,
                'kegiatan' => $resolvedItem->resolved_kegiatan ?? null,
                'sub_kegiatan' => $resolvedItem->resolved_sub_kegiatan ?? null,
            ] : null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
