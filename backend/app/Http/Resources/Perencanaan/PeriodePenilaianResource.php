<?php

declare(strict_types=1);

namespace App\Http\Resources\Perencanaan;

use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Perencanaan\PeriodePenilaian
 */
class PeriodePenilaianResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $today = Carbon::today();
        $endDate = $this->tanggal_akhir ? Carbon::parse($this->tanggal_akhir)->startOfDay() : null;
        $sisaHari = null;

        if ($endDate) {
            $sisaHari = (int) $today->diffInDays($endDate, false); // can be negative if past deadline
        }

        return [
            'id' => $this->id,
            'nama_periode' => $this->nama_periode,
            'tahun_mulai' => $this->tahun_mulai,
            'tahun_akhir' => $this->tahun_akhir,
            'tahun_penilaian' => $this->tahun_penilaian,
            'rentang_tahun' => "{$this->tahun_mulai} - {$this->tahun_akhir}",
            'daftar_tahun' => range($this->tahun_mulai, $this->tahun_akhir),
            'tanggal_mulai' => $this->tanggal_mulai ? Carbon::parse($this->tanggal_mulai)->format('Y-m-d') : null,
            'tanggal_akhir' => $this->tanggal_akhir ? Carbon::parse($this->tanggal_akhir)->format('Y-m-d') : null,
            'status' => $this->status,
            'is_aktif' => $this->status === 'aktif',
            'sisa_hari' => $sisaHari,
            'keterangan' => $this->keterangan,
            'created_by' => $this->created_by,
            'creator' => $this->whenLoaded('creator', function () {
                return $this->creator ? [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                    'nip' => $this->creator->nip,
                ] : null;
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
