<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class ActivateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $user = User::where('activation_token', $this->input('token'))->first();
        $userId = $user?->id;

        return [
            'token' => ['required', 'string'],
            'name' => ['required', 'string', 'max:100'],
            'nip' => [
                'required',
                'string',
                'max:30',
                Rule::unique('users', 'nip')->ignore($userId),
            ],
            'phone' => ['required', 'string', 'max:20'],
            'pangkat_gol' => ['required', 'string', 'max:60'],
            'jabatan' => ['required', 'string', 'max:150'],
            'opd_id' => ['required', 'string', 'uuid', 'exists:opds,id'],
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
            'name.required' => 'Nama lengkap beserta gelar wajib diisi.',
            'name.max' => 'Nama lengkap pegawai maksimal 100 karakter.',
            'nip.required' => 'NIP pegawai wajib diisi.',
            'nip.unique' => 'Nomor Induk Pegawai (NIP) ini sudah terdaftar pada akun lain.',
            'nip.max' => 'NIP maksimal 30 karakter.',
            'phone.required' => 'Nomor kontak / WhatsApp wajib diisi.',
            'phone.max' => 'Nomor telepon maksimal 20 karakter.',
            'pangkat_gol.required' => 'Pangkat / Golongan Ruang wajib dipilih.',
            'pangkat_gol.max' => 'Pangkat / golongan maksimal 60 karakter.',
            'jabatan.required' => 'Jabatan kedinasan wajib diisi.',
            'jabatan.max' => 'Jabatan maksimal 150 karakter.',
            'opd_id.required' => 'Instansi / Perangkat Daerah (OPD) wajib dipilih.',
            'opd_id.exists' => 'Perangkat Daerah yang dipilih tidak ditemukan dalam sistem.',
            'password.required' => 'Kata sandi wajib diisi.',
            'password.confirmed' => 'Konfirmasi kata sandi tidak cocok.',
            'password.min' => 'Kata sandi minimal 8 karakter.',
        ];
    }
}
