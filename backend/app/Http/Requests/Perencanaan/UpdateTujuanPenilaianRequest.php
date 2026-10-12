<?php

declare(strict_types=1);

namespace App\Http\Requests\Perencanaan;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTujuanPenilaianRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('tujuan.edit') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'opd_id' => ['sometimes', 'required', 'uuid', 'exists:opds,id'],
            'kode_tujuan' => ['nullable', 'string', 'max:50'],
            'tujuan' => ['sometimes', 'required', 'string', 'min:5', 'max:1000'],
            'urutan' => ['nullable', 'integer', 'min:1', 'max:999'],
            'keterangan' => ['nullable', 'string', 'max:2000'],
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
            'opd_id.required' => 'Perangkat Daerah (OPD) wajib dipilih.',
            'opd_id.exists' => 'Perangkat Daerah yang dipilih tidak terdaftar di sistem.',
            'tujuan.required' => 'Pernyataan tujuan strategis wajib diisi.',
            'tujuan.min' => 'Pernyataan tujuan minimal 5 karakter.',
            'tujuan.max' => 'Pernyataan tujuan maksimal 1000 karakter.',
        ];
    }
}
