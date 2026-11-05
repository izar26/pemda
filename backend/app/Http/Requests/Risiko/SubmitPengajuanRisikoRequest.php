<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class SubmitPengajuanRisikoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('penilaian_risiko.submit') ?? false;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'opd_id' => ['nullable', 'uuid'],
            'periode_penilaian_id' => ['nullable', 'uuid'],
            'catatan' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
