<?php

declare(strict_types=1);

namespace App\Http\Requests\Opd;

use Illuminate\Foundation\Http\FormRequest;

class ReorderOpdRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('opd.edit') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:opds,id'],
        ];
    }
}
