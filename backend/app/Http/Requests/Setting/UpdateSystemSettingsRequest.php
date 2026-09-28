<?php

declare(strict_types=1);

namespace App\Http\Requests\Setting;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSystemSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('settings.edit') ?? false;
    }

    public function rules(): array
    {
        return [
            'settings' => ['required', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'settings.required' => 'Data pengaturan wajib dikirim.',
            'settings.array' => 'Format pengaturan harus berupa array.',
        ];
    }
}
