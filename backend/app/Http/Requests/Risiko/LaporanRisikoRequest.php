<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class LaporanRisikoRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Administrator', 'Admin Office', 'Inspektorat', 'Koordinator Pengawas', 'Evaluator / Reviewer', 'Auditor', 'Operator OPD', 'OPD'])
            || $user->can('laporan.view')
            || $user->can('konteks_risiko.view')
            || $user->can('konteks_operasional.view');
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'opd_id' => ['nullable', 'string', 'uuid'],
            'tahun' => ['nullable', 'integer', 'min:2020', 'max:2099'],
        ];
    }
}
