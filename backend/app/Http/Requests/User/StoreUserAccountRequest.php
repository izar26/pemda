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
            'pegawai_id' => ['required', 'string', 'uuid', 'exists:users,id'],
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
            'role.required' => 'Peran (Role) wajib dipilih.',
            'role.exists' => 'Peran yang dipilih tidak ditemukan dalam sistem.',
            'status.required' => 'Status akun wajib dipilih.',
            'status.in' => 'Status akun hanya boleh Aktif (active) atau Nonaktif (inactive).',
            'password.required' => 'Kata sandi wajib diisi.',
        ];
    }
}
