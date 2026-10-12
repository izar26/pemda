<?php

declare(strict_types=1);

namespace App\Http\Requests\Perencanaan;

use Illuminate\Foundation\Http\FormRequest;

class CopyIndikatorPenilaianRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('iku.copy') || $this->user()?->can('iku.create') ?? false;
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
            'sasaran_penilaian_id' => ['nullable', 'uuid', 'exists:sasaran_penilaians,id'],
            'jenis' => ['nullable', 'in:all,IKU,Biasa'],
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
            'sasaran_penilaian_id' => 'Sasaran Strategis Renstra',
            'jenis' => 'Jenis Indikator',
        ];
    }
}
