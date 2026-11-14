<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class SaveTindakPengendalianRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) ($this->user()?->can('identifikasi_risiko_opd.edit') || $this->user()?->can('identifikasi_risiko_opd_operasional.edit'));
    }

    public function rules(): array
    {
        return [
            'celah_pengendalian' => ['nullable', 'string', 'max:5000'],
            'rencana_tindak' => ['nullable', 'string', 'max:5000'],
            'penanggung_jawab' => ['nullable', 'string', 'max:5000'],
            'target_waktu' => ['nullable', 'string', 'max:5000'],
            'treated_kemungkinan' => ['nullable', 'integer', 'between:1,5'],
            'treated_dampak' => ['nullable', 'integer', 'between:1,5'],
        ];
    }
}
