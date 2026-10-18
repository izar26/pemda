<?php

declare(strict_types=1);

namespace App\Http\Requests\Setting;

use Illuminate\Foundation\Http\FormRequest;

class UploadLogoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('settings.edit') ?? false;
    }

    public function rules(): array
    {
        return [
            'logo' => [
                'required',
                'file',
                'mimes:png,jpg,jpeg,webp,svg',
                'max:2048', // 2 MB limit
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'logo.required' => 'Berkas gambar logo wajib dipilih.',
            'logo.file' => 'Berkas logo harus berupa file yang valid.',
            'logo.mimes' => 'Format logo hanya mendukung PNG, JPG, JPEG, WebP, atau SVG.',
            'logo.max' => 'Ukuran berkas logo maksimal 2 MB.',
        ];
    }
}
