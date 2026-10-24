<?php

declare(strict_types=1);

namespace App\Http\Requests\User;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

class StoreUserAccountRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('users.create') ?? false;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->has('account_type')) {
            $merge['account_type'] = $this->account_type;
        } else {
            $merge['account_type'] = !empty($this->pegawai_id) ? 'pegawai' : 'direct';
        }

        if ($this->has('email') && is_string($this->email)) {
            $merge['email'] = strtolower(trim($this->email));
        }

        if ($this->has('nip') && is_string($this->nip)) {
            $cleanedNip = preg_replace('/\s+/', '', trim($this->nip));
            $merge['nip'] = ($cleanedNip === '' || $cleanedNip === '-') ? null : $cleanedNip;
        }

        if ($this->has('phone') && is_string($this->phone)) {
            $cleanedPhone = trim($this->phone);
            $merge['phone'] = $cleanedPhone === '' ? null : $cleanedPhone;
        }

        if ($this->has('name') && is_string($this->name)) {
            $merge['name'] = trim($this->name);
        }

        if ($this->has('jabatan') && is_string($this->jabatan)) {
            $merge['jabatan'] = trim($this->jabatan);
        }

        if ($this->has('opd_id') && ($this->opd_id === '' || $this->opd_id === 'all')) {
            $merge['opd_id'] = null;
        }

        if (!empty($merge)) {
            $this->merge($merge);
        }
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

        $rules = [
            'account_type' => ['nullable', 'string', 'in:pegawai,direct'],
            'role' => $roleRule,
            'status' => ['required', 'string', 'in:active,inactive'],
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

        $accountType = $this->input('account_type', !empty($this->pegawai_id) ? 'pegawai' : 'direct');

        if ($accountType === 'pegawai') {
            $rules['pegawai_id'] = ['required', 'string', 'uuid', 'exists:users,id'];
        } else {
            $rules['name'] = ['required', 'string', 'max:100'];
            $rules['email'] = ['required', 'string', 'email', 'max:100', 'unique:users,email'];
            $rules['nip'] = ['nullable', 'string', 'max:30', 'unique:users,nip'];
            $rules['phone'] = ['nullable', 'string', 'max:20'];
            $rules['jabatan'] = ['required', 'string', 'max:150'];
            $rules['opd_id'] = ['nullable', 'string', 'uuid', Rule::exists('opds', 'id')->where('is_active', true)];
            $rules['pangkat_gol'] = ['nullable', 'string', 'max:60'];
        }

        return $rules;
    }

    /**
     * Custom after validation hook to verify target pegawai's OPD is active.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if (!empty($this->pegawai_id)) {
                $pegawai = User::find($this->pegawai_id);
                if ($pegawai && $pegawai->opd && !$pegawai->opd->is_active) {
                    $validator->errors()->add('pegawai_id', "Tidak dapat membuat akun untuk pegawai ini karena instansi/OPD '{$pegawai->opd->nama}' saat ini berstatus nonaktif.");
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'pegawai_id.required' => 'Pegawai wajib dipilih.',
            'pegawai_id.exists' => 'Data pegawai yang dipilih tidak ditemukan dalam sistem.',
            'name.required' => 'Nama lengkap wajib diisi.',
            'email.required' => 'Email login wajib diisi.',
            'email.email' => 'Format email login tidak valid.',
            'email.unique' => 'Email ini sudah terdaftar pada pengguna lain.',
            'nip.unique' => 'NIP ini sudah terdaftar pada pengguna lain.',
            'jabatan.required' => 'Jabatan wajib diisi (contoh: Bupati, Wakil Bupati, Sekretaris Daerah).',
            'role.required' => 'Peran (Role) wajib dipilih.',
            'role.exists' => 'Peran yang dipilih tidak ditemukan dalam sistem.',
            'status.required' => 'Status akun wajib dipilih.',
            'status.in' => 'Status akun hanya boleh Aktif (active) atau Nonaktif (inactive).',
            'password.required' => 'Kata sandi wajib diisi.',
        ];
    }
}
