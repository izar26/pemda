<?php

declare(strict_types=1);

namespace App\Http\Resources\Risiko;

use App\Models\Risiko\FraudRiskAssessment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin FraudRiskAssessment
 */
class FraudRiskAssessmentResource extends JsonResource
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
            'opd_id' => $this->opd_id,
            'periode_penilaian_id' => $this->periode_penilaian_id,
            'nomor_urut' => $this->nomor_urut,
            'proses_bisnis' => $this->proses_bisnis,
            'identifikasi_risiko_kecurangan' => $this->identifikasi_risiko_kecurangan,
            'skenario_kecurangan' => $this->skenario_kecurangan,
            'jenis_fraud_id' => $this->jenis_fraud_id,
            'jenis_risiko_kecurangan' => $this->jenis_risiko_kecurangan,
            'pemilik_risiko' => $this->pemilik_risiko,
            'penyebab' => $this->penyebab,
            'existing_control' => $this->existing_control,
            'kemungkinan_kriteria' => $this->kemungkinan_kriteria,
            'kemungkinan_skor' => $this->kemungkinan_skor,
            'dampak_kriteria' => $this->dampak_kriteria,
            'dampak_skor' => $this->dampak_skor,
            'skala_risiko' => $this->skala_risiko,
            'mitigasi' => $this->mitigasi,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
