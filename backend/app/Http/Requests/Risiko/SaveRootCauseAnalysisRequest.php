<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use App\Models\Risiko\RootCauseAnalysis;
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
        $user = $this->user();
        if (! $user) {
            return false;
        }

        $canEdit = $user->can('rca.edit')
            || $user->can('identifikasi_risiko_pemda.edit')
            || $user->can('identifikasi_risiko_opd.edit')
            || $user->can('identifikasi_risiko_opd_operasional.edit');

        if (! $canEdit && ! $user->hasRole(['Superadmin', 'Admin Office'])) {
            return false;
        }

        $rca = $this->route('rca');
        if ($rca instanceof RootCauseAnalysis && $user->hasRole('OPD') && ! $user->hasRole(['Superadmin', 'Admin Office'])) {
            $item = match ($rca->source_type) {
                '3c' => $rca->itemOperasional,
                '3b' => $rca->itemOpd,
                default => ($rca->itemPemda ?? $rca->item),
            };
            $dokumen = $item?->dokumen;
            if ($dokumen && (string) $user->opd_id !== (string) $dokumen->opd_id) {
                return false;
            }
        }

        return true;
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
