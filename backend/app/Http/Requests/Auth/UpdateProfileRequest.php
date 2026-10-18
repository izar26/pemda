<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $user = $this->user();
        if ($user && !$user->hasRole(['Superadmin', 'Admin Office'])) {
            // Protect against self-mutation of OPD and Jabatan by regular employees
            $this->merge([
                'opd_id' => $user->opd_id,
                'jabatan' => $user->jabatan,
            ]);
        }
    }

    public function rules(): array
    {
        $userId = $this->user()?->id;

        return [
            'name' => ['required', 'string', 'max:100'],
            'nip' => [
                'nullable',
                'string',
                'max:30',
                Rule::unique('users', 'nip')->ignore($userId),
            ],
            'phone' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('users', 'phone')->ignore($userId),
            ],
            'pangkat_gol' => ['nullable', 'string', 'max:60'],
            'jabatan' => ['nullable', 'string', 'max:150'],
            'opd_id' => [
                'nullable',
                'string',
                'uuid',
                Rule::exists('opds', 'id')->where('is_active', true),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama lengkap pegawai wajib diisi.',
            'name.max' => 'Nama lengkap maksimal 100 karakter.',
            'nip.unique' => 'NIP ini sudah terdaftar untuk pegawai lain.',
            'nip.max' => 'NIP maksimal 30 karakter.',
            'phone.unique' => 'Nomor WhatsApp ini sudah terdaftar untuk pegawai lain.',
            'phone.max' => 'Nomor telepon maksimal 20 karakter.',
            'opd_id.exists' => 'Instansi / Perangkat Daerah yang dipilih tidak valid.',
        ];
    }
}
