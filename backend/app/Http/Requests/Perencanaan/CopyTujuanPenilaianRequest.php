<?php

declare(strict_types=1);

namespace App\Http\Requests\Perencanaan;

use Illuminate\Foundation\Http\FormRequest;

class CopyTujuanPenilaianRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('tujuan.copy') || $this->user()?->can('tujuan.create') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'source_periode_id' => ['required', 'uuid', 'exists:periode_penilaians,id'],
            'opd_id' => ['nullable', 'uuid', 'exists:opds,id'],
        ];
    }

    /**
     * Custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'source_periode_id.required' => 'Periode asal (sumber data) wajib dipilih.',
            'source_periode_id.exists' => 'Periode asal tidak ditemukan di sistem.',
            'opd_id.exists' => 'Perangkat Daerah tidak valid.',
        ];
    }
}
