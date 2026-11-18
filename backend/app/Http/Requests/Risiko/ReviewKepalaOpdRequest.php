<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use App\Services\Risiko\Registry\RiskFormRegistry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewKepalaOpdRequest extends FormRequest
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
            'status' => ['required', 'string', 'in:approved,rejected'],
            'form_code' => ['nullable', 'required_if:status,rejected', 'string', Rule::in(app(RiskFormRegistry::class)->getCodes())],
            'catatan' => ['nullable', 'string', 'required_if:status,rejected', 'min:5', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'status.required' => 'Status persetujuan wajib ditentukan.',
            'status.in' => 'Status harus berupa disetujui (approved) atau ditolak (rejected).',
            'form_code.required_if' => 'Pilih formulir yang perlu diperbaiki.',
            'catatan.required_if' => 'Catatan revisi wajib diisi minimal 5 karakter apabila draf ditolak.',
            'catatan.min' => 'Catatan revisi minimal 5 karakter.',
        ];
    }
}
