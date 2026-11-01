<?php

declare(strict_types=1);

namespace App\Http\Requests\Audit;

use Illuminate\Foundation\Http\FormRequest;

class DestroyAllAuditLogsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) {
            return false;
        }

        return $user->hasRole('Superadmin') || $user->roles()->where('is_system', true)->exists();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'password.required' => 'Kata sandi akun Superadmin wajib dimasukkan sebagai otorisasi.',
        ];
    }
}
