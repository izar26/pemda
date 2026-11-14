<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class IndexFraudRiskAssessmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) ($user?->can('identifikasi_risiko_opd.view')
            || $user?->can('identifikasi_risiko_opd_operasional.view')
            || $user?->can('identifikasi_risiko_pemda.view'));
    }

    public function rules(): array
    {
        return [
            'opd_id' => ['required', 'uuid', 'exists:opds,id'],
            'periode_penilaian_id' => ['required', 'uuid', 'exists:periode_penilaians,id'],
            'proses_bisnis' => ['nullable', 'string', 'max:255'],
            'jenis_fraud_id' => ['nullable', 'uuid', 'exists:master_jenis_frauds,id'],
            'search' => ['nullable', 'string', 'max:255'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
