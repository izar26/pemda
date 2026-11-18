<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use App\Services\Risiko\Registry\RiskFormRegistry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DelegateOperatorRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        return $user->isRegionalAdmin()
            || ($user->isKepalaOpd() && $user->can('review_risiko.review_kepala'));
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'form_code' => ['nullable', 'string', Rule::in(app(RiskFormRegistry::class)->getCodes())],
            'catatan' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
