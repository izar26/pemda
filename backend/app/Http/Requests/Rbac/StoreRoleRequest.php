<?php

declare(strict_types=1);

namespace App\Http\Requests\Rbac;

use Illuminate\Foundation\Http\FormRequest;

class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('roles.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:50', 'unique:roles,name'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Nama peran (role) wajib diisi.',
            'name.unique' => 'Nama peran ini sudah digunakan.',
            'name.max' => 'Nama peran maksimal 50 karakter.',
            'description.max' => 'Deskripsi maksimal 255 karakter.',
            'permissions.present' => 'Daftar hak akses wajib disertakan.',
            'permissions.array' => 'Format hak akses harus berupa daftar array.',
            'permissions.*.exists' => 'Salah satu hak akses yang dipilih tidak terdaftar di sistem.',
        ];
    }
}
