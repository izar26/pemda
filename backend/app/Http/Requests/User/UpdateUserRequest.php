<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('users.edit') ?? false;
    }

    public function rules(): array
    {
        $targetUser = $this->route('user');
        $userId = $targetUser instanceof User ? $targetUser->id : $targetUser;

        return [
            'name' => ['required', 'string', 'max:100'],
            'email' => [
                'required',
                'string',
                'email',
                'max:100',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'nip' => [
                'nullable',
                'string',
                'max:30',
                Rule::unique('users', 'nip')->ignore($userId),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'opd_id' => ['nullable', 'integer', 'exists:opds,id'],
            'pangkat_gol' => ['nullable', 'string', 'max:60'],
            'jabatan' => ['nullable', 'string', 'max:150'],
            'role' => ['required', 'string', 'exists:roles,name'],
            'status' => ['required', 'string', 'in:active,inactive,suspended,pending_activation'],

            'password' => [
                'nullable',
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
            'email.unique' => 'Email ini sudah digunakan oleh pegawai lain.',
            'nip.unique' => 'NIP ini sudah terdaftar untuk pegawai lain.',
            'role.required' => 'Peran (Role) wajib dipilih.',
            'role.exists' => 'Peran yang dipilih tidak ditemukan dalam sistem.',
            'status.required' => 'Status pegawai wajib ditentukan.',
            'status.in' => 'Status pegawai harus aktif, nonaktif, atau suspended.',
        ];
    }
}
