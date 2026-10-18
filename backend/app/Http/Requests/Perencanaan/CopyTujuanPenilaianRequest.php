<?php

declare(strict_types=1);

namespace App\Http\Requests\Perencanaan;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
