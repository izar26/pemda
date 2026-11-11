<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class ReviewFormRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('review_risiko.view');
    }

    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'search' => ['nullable', 'string', 'max:200'],
            'source' => ['nullable', 'in:3a,3b,3c'],
            'status' => ['nullable', 'in:complete,incomplete'],
        ];
    }
}
