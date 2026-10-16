<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Rules\TurnstileRule;
use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $turnstileEnabled = (bool) config('services.turnstile.enabled', true);

        return [
            'identifier' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string'],
            'turnstile_token' => [
                $turnstileEnabled ? 'required' : 'nullable',
                'string',
                new TurnstileRule(action: 'login', clientIp: $this->ip()),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'identifier.required' => 'Email atau NIP wajib diisi.',
            'password.required' => 'Kata sandi wajib diisi.',
            'turnstile_token.required' => 'Verifikasi keamanan bot wajib diselesaikan.',
        ];
    }
}
