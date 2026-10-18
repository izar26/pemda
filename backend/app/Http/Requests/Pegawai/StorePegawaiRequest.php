<?php

declare(strict_types=1);

namespace App\Http\Requests\Pegawai;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePegawaiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('pegawai.create') ?? false;
    }

    protected function prepareForValidation(): void
    {
        $user = $this->user();
        $mergeData = [
            'name' => is_string($this->name) ? trim($this->name) : $this->name,
            'email' => is_string($this->email) ? strtolower(trim($this->email)) : $this->email,
            'nip' => is_string($this->nip) ? preg_replace('/\s+/', '', trim($this->nip)) : $this->nip,
            'phone' => is_string($this->phone) ? preg_replace('/\s+/', '', trim($this->phone)) : $this->phone,
        ];

        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office'])) {
            $mergeData['opd_id'] = $user->opd_id;
        }

        $this->merge($mergeData);
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:100', 'unique:users,email'],
            'nip' => ['required', 'string', 'max:30', 'unique:users,nip'],
            'phone' => ['required', 'string', 'max:20', 'unique:users,phone'],
            'opd_id' => [
                'required',
                'string',
                'uuid',
                Rule::exists('opds', 'id')->where('is_active', true),
            ],
            'pangkat_gol' => ['required', 'string', 'max:60'],
            'jabatan' => ['required', 'string', 'in:Kepala OPD,Pegawai'],
            'replace_kepala' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama lengkap pegawai wajib diisi.',
            'name.max' => 'Nama lengkap maksimal 100 karakter.',
            'email.required' => 'Email dinas wajib diisi.',
            'email.email' => 'Format email tidak valid.',
            'email.unique' => 'Email ini sudah terdaftar pada pegawai lain.',
            'nip.required' => 'NIP pegawai wajib diisi.',
            'nip.unique' => 'NIP ini sudah terdaftar pada pegawai lain.',
            'nip.max' => 'NIP maksimal 30 karakter.',
            'phone.required' => 'Nomor WhatsApp wajib diisi.',
            'phone.unique' => 'Nomor WhatsApp ini sudah terdaftar pada pegawai lain.',
            'phone.max' => 'Nomor WhatsApp maksimal 20 karakter.',
            'opd_id.required' => 'Instansi / Perangkat Daerah (OPD) wajib dipilih.',
            'opd_id.exists' => 'Perangkat Daerah yang dipilih tidak ditemukan dalam sistem.',
            'pangkat_gol.required' => 'Pangkat / Golongan Ruang wajib dipilih.',
            'jabatan.required' => 'Jabatan kedinasan wajib dipilih.',
            'jabatan.in' => 'Jabatan hanya boleh dipilih antara Kepala OPD atau Pegawai.',
        ];
    }
}
