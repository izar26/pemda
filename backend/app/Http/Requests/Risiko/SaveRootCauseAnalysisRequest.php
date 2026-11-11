<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SaveRootCauseAnalysisRequest extends FormRequest
{
    public const VALID_JENIS_PENYEBAB = [
        'Man',
        'Money',
        'Method',
        'Machine',
        'Material',
        'Eksternal',
    ];

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('rca.edit')
            || false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'why_1' => ['nullable', 'string', 'max:2000'],
            'why_2' => ['nullable', 'string', 'max:2000'],
            'why_3' => ['nullable', 'string', 'max:2000'],
            'why_4' => ['nullable', 'string', 'max:2000'],
            'why_5' => ['nullable', 'string', 'max:2000'],
            'jenis_penyebab' => ['nullable', 'string', 'in:'.implode(',', self::VALID_JENIS_PENYEBAB)],
            'kegiatan_pengendalian' => ['nullable', 'string', 'max:3000'],
        ];
    }

    /**
     * Custom validation attribute names.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'why_1' => 'Why 1 (Penyebab Langsung)',
            'why_2' => 'Why 2',
            'why_3' => 'Why 3',
            'why_4' => 'Why 4',
            'why_5' => 'Why 5',
            'jenis_penyebab' => 'Jenis / Kategori Penyebab',
            'kegiatan_pengendalian' => 'Kegiatan Pengendalian',
        ];
    }
}
