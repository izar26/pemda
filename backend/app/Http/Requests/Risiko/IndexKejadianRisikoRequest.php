<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class IndexKejadianRisikoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'opd_id' => ['required', 'uuid', 'exists:opds,id'],
            'periode_penilaian_id' => ['required', 'uuid', 'exists:periode_penilaians,id'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'search' => ['nullable', 'string', 'max:200'],
            'source' => ['nullable', 'in:3a,3b,3c'],
        ];
    }
}
