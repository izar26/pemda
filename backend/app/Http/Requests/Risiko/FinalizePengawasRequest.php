<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class FinalizePengawasRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        return $user->isRegionalAdmin()
            || ($user->isScopedPengawas() && $user->can('review_risiko.review_pengawas'));
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'catatan' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
