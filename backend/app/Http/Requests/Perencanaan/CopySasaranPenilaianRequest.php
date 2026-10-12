<?php

declare(strict_types=1);

namespace App\Http\Requests\Perencanaan;

use Illuminate\Foundation\Http\FormRequest;

class CopySasaranPenilaianRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('sasaran.copy') || $this->user()?->can('sasaran.create') ?? false;
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
            'tujuan_penilaian_id' => ['nullable', 'uuid', 'exists:tujuan_penilaians,id'],
        ];
    }

    /**
     * Custom validation attribute names.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'source_periode_id' => 'Periode Asal',
            'opd_id' => 'Perangkat Daerah',
            'tujuan_penilaian_id' => 'Tujuan Strategis Renstra',
        ];
    }
}
