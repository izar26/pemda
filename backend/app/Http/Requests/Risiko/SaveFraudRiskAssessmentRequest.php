<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class SaveFraudRiskAssessmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) ($user?->can('identifikasi_risiko_opd.edit')
            || $user?->can('identifikasi_risiko_opd_operasional.edit')
            || $user?->can('identifikasi_risiko_pemda.edit'));
    }

    protected function prepareForValidation(): void
    {
        if (empty($this->pemilik_risiko)) {
            $this->merge(['pemilik_risiko' => 'Kepala SKPD']);
        }
    }

    public function rules(): array
    {
        $isPost = $this->isMethod('post');

        return [
            'opd_id' => [$isPost ? 'required' : 'sometimes', 'uuid', 'exists:opds,id'],
            'periode_penilaian_id' => [$isPost ? 'required' : 'sometimes', 'uuid', 'exists:periode_penilaians,id'],
            'nomor_urut' => ['nullable', 'integer', 'min:1'],
            'proses_bisnis' => [$isPost ? 'required' : 'sometimes', 'string', 'max:255'],
            'identifikasi_risiko_kecurangan' => [$isPost ? 'required' : 'sometimes', 'string', 'max:5000'],
            'skenario_kecurangan' => [$isPost ? 'required' : 'sometimes', 'string', 'max:5000'],
            'jenis_fraud_id' => ['nullable', 'uuid', 'exists:master_jenis_frauds,id'],
            'jenis_risiko_kecurangan' => ['nullable', 'string', 'max:150'],
            'pemilik_risiko' => [$isPost ? 'required' : 'sometimes', 'string', 'max:150'],
            'penyebab' => [$isPost ? 'required' : 'sometimes', 'string', 'max:100'],
            'existing_control' => [$isPost ? 'required' : 'sometimes', 'string', 'max:5000'],
            'kemungkinan_kriteria' => [$isPost ? 'required' : 'sometimes', 'string', 'max:100'],
            'kemungkinan_skor' => [$isPost ? 'required' : 'sometimes', 'integer', 'between:1,5'],
            'dampak_kriteria' => [$isPost ? 'required' : 'sometimes', 'string', 'max:100'],
            'dampak_skor' => [$isPost ? 'required' : 'sometimes', 'integer', 'between:1,5'],
            'mitigasi' => [$isPost ? 'required' : 'sometimes', 'string', 'max:5000'],
        ];
    }
}
