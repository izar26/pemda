<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class SaveIdentifikasiRisikoOpdOperasionalItemRequest extends FormRequest
{
    public const VALID_KATEGORI = [
        'Risiko Operasional',
        'Risiko Fraud',
        'Risiko Belanja',
        'Risiko Pendapatan',
        'Risiko Pembiayaan',
        'Risiko Kepatuhan',
        'Risiko Strategis',
        'Risiko Reputasi',
    ];

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('identifikasi_risiko_opd_operasional.create')
            || $this->user()?->can('identifikasi_risiko_opd_operasional.edit')
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
            'operasional_sub_kegiatan_id' => ['nullable', 'uuid', 'exists:konteks_operasional_items,id'],
            'sub_kegiatan_kustom' => ['nullable', 'string', 'max:1000'],
            'indikator_keluaran_kustom' => ['nullable', 'string', 'max:1000'],
            'probis' => ['nullable', 'string', 'max:150'],
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
            'operasional_sub_kegiatan_id' => 'Sub-Kegiatan Form 2C',
            'sub_kegiatan_kustom' => 'Sub-Kegiatan Kustom',
            'indikator_keluaran_kustom' => 'Indikator Keluaran Kustom',
            'probis' => 'Proses Bisnis (PROBIS)',
            'kategori_risiko' => 'Kategori Risiko',
            'pernyataan_risiko' => 'Pernyataan Risiko Operasional',
            'pemilik_risiko' => 'Pemilik Risiko',
            'sifat_risiko' => 'Sifat Risiko (C/UC)',
            'uraian_dampak' => 'Uraian Dampak',
            'pihak_terkena' => 'Pihak yang Terkena',
            'urutan' => 'Urutan Tampilan',
        ];
    }
}
