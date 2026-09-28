<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class InviteUserRequest extends FormRequest
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
            'role' => ['required', 'string', 'exists:roles,name'],
            'opd_id' => ['nullable', 'integer', 'exists:opds,id'],
            'jabatan' => ['nullable', 'string', 'max:150'],
            'notes' => ['nullable', 'string', 'max:500'],

        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama lengkap pegawai wajib diisi.',
            'name.max' => 'Nama pegawai maksimal 100 karakter.',
            'email.required' => 'Alamat email wajib diisi.',
            'email.email' => 'Format alamat email tidak valid.',
            'email.unique' => 'Alamat email ini sudah terdaftar di sistem portal.',
            'role.required' => 'Peran (role) wajib dipilih.',
            'role.exists' => 'Peran yang dipilih tidak terdaftar di sistem.',
            'notes.max' => 'Catatan undangan maksimal 500 karakter.',
        ];
    }
}
