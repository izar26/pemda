<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('users.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:100', 'unique:users,email'],
            'nip' => ['nullable', 'string', 'max:30', 'unique:users,nip'],
            'phone' => ['nullable', 'string', 'max:20'],
            'opd_id' => ['nullable', 'integer', 'exists:opds,id'],
            'pangkat_gol' => ['nullable', 'string', 'max:60'],
            'jabatan' => ['nullable', 'string', 'max:150'],
            'role' => ['required', 'string', 'exists:roles,name'],
            'status' => ['sometimes', 'string', 'in:active,inactive,suspended'],

            'password' => [
                'required',
                'string',
                Password::min(8)
                    ->letters()
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama lengkap pegawai wajib diisi.',
            'name.max' => 'Nama lengkap maksimal 100 karakter.',
            'email.required' => 'Email dinas wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email ini sudah terdaftar di sistem.',
            'nip.unique' => 'NIP ini sudah terdaftar untuk pegawai lain.',
            'role.required' => 'Peran (Role) wajib dipilih.',
            'role.exists' => 'Peran yang dipilih tidak ditemukan dalam sistem.',
            'status.in' => 'Status pegawai harus aktif, nonaktif, atau suspended.',
            'password.required' => 'Kata sandi wajib diisi.',
        ];
    }
}
