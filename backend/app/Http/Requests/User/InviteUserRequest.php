<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InviteUserRequest extends FormRequest
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
            'role' => $roleRule,
            'opd_id' => ['required', 'string', 'uuid', 'exists:opds,id'],
            'jabatan' => ['required', 'string', 'max:150'],
            'notes' => ['required', 'string', 'max:500'],
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
            'opd_id.required' => 'Instansi / Perangkat Daerah (OPD) wajib dipilih.',
            'opd_id.exists' => 'Perangkat Daerah yang dipilih tidak ditemukan dalam sistem.',
            'jabatan.required' => 'Jabatan kedinasan wajib diisi.',
            'jabatan.max' => 'Jabatan kedinasan maksimal 150 karakter.',
            'notes.required' => 'Catatan undangan wajib diisi.',
            'notes.max' => 'Catatan undangan maksimal 500 karakter.',
        ];
    }
}
