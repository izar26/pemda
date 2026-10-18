<?php

declare(strict_types=1);

namespace App\Http\Requests\Perencanaan;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CopyIndikatorPenilaianRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return ($this->user()?->can('tujuan.copy') || $this->user()?->can('tujuan.create')) ?? false;
    }

    /**
     * Prepare data before validation.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();
        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida'])) {
            $this->merge(['opd_id' => $user->opd_id]);
        }
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
            'opd_id' => [
                'nullable',
                'uuid',
                Rule::exists('opds', 'id')->where('is_active', true),
            ],
            'sasaran_penilaian_id' => ['nullable', 'uuid', 'exists:sasaran_penilaians,id'],
            'jenis' => ['nullable', 'in:all,IKU,Biasa'],
        ];
    }

    /**
     * Custom after validation hook for cascading integrity.
     */
    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if (!empty($this->sasaran_penilaian_id)) {
                $sasaran = \App\Models\Perencanaan\SasaranPenilaian::find($this->sasaran_penilaian_id);
                if ($sasaran && !empty($this->opd_id) && $sasaran->opd_id !== $this->opd_id) {
                    $validator->errors()->add('sasaran_penilaian_id', 'Sasaran strategis yang dipilih tidak berasal dari Perangkat Daerah (OPD) yang sama.');
                }
            }
        });
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
