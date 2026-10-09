<?php

declare(strict_types=1);

namespace App\Http\Requests\Content;

use Illuminate\Foundation\Http\FormRequest;

class ReorderBannerRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('content.manage') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'banner_ids' => ['required', 'array', 'min:1'],
            'banner_ids.*' => ['required', 'uuid', 'exists:banners,id'],
        ];
    }

    /**
     * Custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'banner_ids.required' => 'Daftar ID banner wajib dikirim.',
            'banner_ids.array' => 'Format daftar ID banner tidak valid.',
            'banner_ids.*.exists' => 'Salah satu ID banner tidak ditemukan.',
        ];
    }
}
