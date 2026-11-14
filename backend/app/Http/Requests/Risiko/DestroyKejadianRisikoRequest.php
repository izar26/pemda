<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class DestroyKejadianRisikoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) ($user?->can('identifikasi_risiko_opd.edit')
            || $user?->can('identifikasi_risiko_opd_operasional.edit')
            || $user?->can('identifikasi_risiko_pemda.edit'));
    }

    public function rules(): array
    {
        return [];
    }
}
