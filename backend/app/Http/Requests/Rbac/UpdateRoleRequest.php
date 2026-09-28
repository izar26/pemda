<?php

declare(strict_types=1);

namespace App\Http\Requests\Rbac;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('roles.edit') ?? false;
    }

    public function rules(): array
    {
        /** @var \App\Models\Role|int|string $role */
        $roleId = $this->route('role');
        if (is_object($roleId)) {
            $roleId = $roleId->id;
        }

        return [
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('roles', 'name')->ignore($roleId),
            ],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama peran (role) wajib diisi.',
            'name.unique' => 'Nama peran ini sudah digunakan oleh peran lain.',
            'name.max' => 'Nama peran maksimal 50 karakter.',
            'description.max' => 'Deskripsi maksimal 255 karakter.',
            'permissions.present' => 'Daftar hak akses wajib disertakan.',
            'permissions.array' => 'Format hak akses harus berupa daftar array.',
            'permissions.*.exists' => 'Salah satu hak akses yang dipilih tidak terdaftar di sistem.',
        ];
    }
}
