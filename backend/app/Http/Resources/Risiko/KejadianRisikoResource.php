<?php

declare(strict_types=1);

namespace App\Http\Resources\Risiko;

use App\Models\Risiko\PencatatanKejadianRisiko;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin PencatatanKejadianRisiko
 */
class KejadianRisikoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $risk = $this->getLinkedRisk();
        $rtp = $this->getRtpInfo();

        return [
            'id' => (string) $this->id,
            'opd_id' => (string) $this->opd_id,
            'periode_penilaian_id' => (string) $this->periode_penilaian_id,
            'source_type' => $this->source_type,
            'risk_item_id' => match ($this->source_type) {
                '3a' => (string) $this->identifikasi_risiko_pemda_item_id,
                '3b' => (string) $this->identifikasi_risiko_opd_item_id,
                '3c' => (string) $this->identifikasi_risiko_opd_operasional_item_id,
                default => null,
            },
            'kode_risiko' => $risk?->kode_risiko,
            'pernyataan_risiko' => $risk?->pernyataan_risiko,
            'kategori_risiko' => $risk?->kategori_risiko,
            'pemilik_risiko' => $risk?->pemilik_risiko,
            'uraian_dampak_risiko' => $risk?->uraian_dampak,
            'tanggal_kejadian' => $this->tanggal_kejadian instanceof \DateTimeInterface
                ? $this->tanggal_kejadian->format('Y-m-d')
                : (string) $this->tanggal_kejadian,
            'sebab' => $this->sebab,
            'dampak' => $this->dampak,
            'keterangan' => $this->keterangan,
            'rencana_tindak' => $rtp['rencana_tindak'] ?? null,
            'target_waktu' => $rtp['target_waktu'] ?? null,
            'has_rtp' => ! empty($rtp['rencana_tindak']),
            'realisasi_waktu_rtp' => $this->realisasi_waktu_rtp,
            'keterangan_rtp' => $this->keterangan_rtp,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
