<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class SaveKejadianRisikoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) ($user?->can('identifikasi_risiko_opd.edit')
            || $user?->can('identifikasi_risiko_opd_operasional.edit')
            || $user?->can('identifikasi_risiko_pemda.edit'));
    }

    public function rules(): array
    {
        $isPost = $this->isMethod('post');

        return [
            'opd_id' => [$isPost ? 'required' : 'sometimes', 'uuid', 'exists:opds,id'],
            'periode_penilaian_id' => [$isPost ? 'required' : 'sometimes', 'uuid', 'exists:periode_penilaians,id'],
            'source_type' => [$isPost ? 'required' : 'required_with:risk_item_id', 'in:3a,3b,3c'],
            'risk_item_id' => [$isPost ? 'required' : 'required_with:source_type', 'uuid'],
            'tanggal_kejadian' => [$isPost ? 'required' : 'sometimes', 'date'],
            'sebab' => [$isPost ? 'required' : 'sometimes', 'string', 'max:5000'],
            'dampak' => [$isPost ? 'required' : 'sometimes', 'string', 'max:5000'],
            'keterangan' => ['nullable', 'string', 'max:5000'],
            'realisasi_waktu_rtp' => ['nullable', 'string', 'max:1000'],
            'keterangan_rtp' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
