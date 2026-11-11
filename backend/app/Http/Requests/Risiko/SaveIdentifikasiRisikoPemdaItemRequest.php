<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SaveIdentifikasiRisikoPemdaItemRequest extends FormRequest
{
    public const VALID_KATEGORI = [
        'Risiko Strategis',
        'Risiko Fraud',
        'Risiko Belanja',
        'Risiko Pendapatan',
        'Risiko Pembiayaan',
        'Risiko Kepatuhan',
        'Risiko Operasional',
        'Risiko Reputasi',
    ];

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('identifikasi_risiko_pemda.create')
            || $this->user()?->can('identifikasi_risiko_pemda.edit')
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
            'sasaran_penilaian_id' => ['nullable', 'uuid', 'exists:sasaran_penilaians,id'],
            'sasaran_kustom' => ['nullable', 'string', 'max:1000'],
            'indikator_penilaian_id' => ['nullable', 'uuid', 'exists:indikator_penilaians,id'],
            'indikator_kustom' => ['nullable', 'string', 'max:1000'],
            'kategori_risiko' => ['required', 'string', 'in:'.implode(',', self::VALID_KATEGORI)],
            'pernyataan_risiko' => ['required', 'string', 'min:3', 'max:2000'],
            'pemilik_risiko' => ['nullable', 'string', 'max:150'],
            'sifat_risiko' => ['required', 'string', 'in:C,UC'],
            'uraian_dampak' => ['nullable', 'string', 'max:2000'],
            'pihak_terkena' => ['nullable', 'string', 'max:255'],
            'urutan' => ['nullable', 'integer', 'min:1'],
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
            'sasaran_penilaian_id' => 'Sasaran Strategis',
            'sasaran_kustom' => 'Sasaran Kustom',
            'indikator_penilaian_id' => 'Indikator Kinerja',
            'indikator_kustom' => 'Indikator Kustom',
            'kategori_risiko' => 'Kategori Risiko',
            'pernyataan_risiko' => 'Uraian / Pernyataan Risiko',
            'pemilik_risiko' => 'Pemilik Risiko',
            'sifat_risiko' => 'Sifat Risiko (C/UC)',
            'uraian_dampak' => 'Uraian Dampak',
            'pihak_terkena' => 'Pihak yang Terkena',
        ];
    }
}
