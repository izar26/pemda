<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('users.create') ?? false;
    }

    public function rules(): array
    {
        $roleRule = ['required', 'string'];
        if (!$this->user()?->hasRole('Superadmin')) {
            $roleRule[] = Rule::exists('roles', 'name')->where(function ($query) {
                $query->where('name', '!=', 'Superadmin');
            });
        } else {
            $roleRule[] = 'exists:roles,name';
        }

        return [
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:100', 'unique:users,email'],
            'nip' => ['required', 'string', 'max:30', 'unique:users,nip'],
            'phone' => ['required', 'string', 'max:20'],
            'opd_id' => ['required', 'string', 'uuid', 'exists:opds,id'],
            'pangkat_gol' => ['required', 'string', 'max:60'],
            'jabatan' => ['required', 'string', 'max:150'],
            'role' => $roleRule,
            'status' => ['required', 'string', 'in:active,inactive,suspended'],

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
            'nip.required' => 'NIP pegawai wajib diisi.',
            'nip.unique' => 'NIP ini sudah terdaftar untuk pegawai lain.',
            'nip.max' => 'NIP maksimal 30 karakter.',
            'phone.required' => 'Nomor WhatsApp / telepon wajib diisi.',
            'phone.max' => 'Nomor telepon maksimal 20 karakter.',
            'opd_id.required' => 'Instansi / Perangkat Daerah (OPD) wajib dipilih.',
            'opd_id.exists' => 'Perangkat Daerah yang dipilih tidak ditemukan dalam sistem.',
            'pangkat_gol.required' => 'Pangkat / Golongan Ruang wajib dipilih.',
            'jabatan.required' => 'Jabatan kedinasan wajib diisi.',
            'jabatan.max' => 'Jabatan maksimal 150 karakter.',
            'role.required' => 'Peran (Role) wajib dipilih.',
            'role.exists' => 'Peran yang dipilih tidak ditemukan dalam sistem.',
            'status.required' => 'Status akun pegawai wajib dipilih.',
            'status.in' => 'Status pegawai harus aktif, nonaktif, atau suspended.',
            'password.required' => 'Kata sandi wajib diisi.',
        ];
    }
}
