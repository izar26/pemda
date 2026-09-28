<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ActivateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string'],
            'name' => ['nullable', 'string', 'max:100'],
            'nip' => ['nullable', 'string', 'max:30', 'unique:users,nip'],
            'phone' => ['nullable', 'string', 'max:20'],
            'pangkat_gol' => ['nullable', 'string', 'max:60'],
            'jabatan' => ['nullable', 'string', 'max:150'],
            'opd_id' => ['nullable', 'integer', 'exists:opds,id'],
            'password' => [

                'required',
                'string',
                'confirmed',
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
            'token.required' => 'Token aktivasi wajib disertakan.',
            'nip.unique' => 'Nomor Induk Pegawai (NIP) ini sudah terdaftar pada akun lain.',
            'nip.max' => 'NIP maksimal 30 karakter.',
            'phone.max' => 'Nomor telepon maksimal 20 karakter.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok.',
            'password.min' => 'Kata sandi minimal 8 karakter.',
        ];
    }
}
