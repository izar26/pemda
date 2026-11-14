<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use App\Models\Risiko\IdentifikasiRisikoOpd;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveIdentifikasiRisikoOpdItemRequest extends FormRequest
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
        $user = $this->user();
        if (! $user) {
            return false;
        }

        $canEdit = $user->can('identifikasi_risiko_opd.create')
            || $user->can('identifikasi_risiko_opd.edit');

        if (! $canEdit && ! $user->hasRole(['Superadmin', 'Admin Office'])) {
            return false;
        }

        $dokumen = $this->route('dokumen');
        if (is_string($dokumen)) {
            $dokumen = IdentifikasiRisikoOpd::find($dokumen);
        }

        if ($dokumen && $user->hasRole('OPD') && ! $user->hasRole(['Superadmin', 'Admin Office'])) {
            return (string) $user->opd_id === (string) $dokumen->opd_id;
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
            'sasaran_penilaian_id' => ['required', 'uuid', 'exists:sasaran_penilaians,id'],
            'sasaran_kustom' => ['prohibited'],
            'indikator_penilaian_id' => ['required', 'uuid', 'exists:indikator_penilaians,id'],
            'indikator_kustom' => ['prohibited'],
            'kategori_risiko' => ['required', 'string', 'in:'.implode(',', self::VALID_KATEGORI)],
            'pernyataan_risiko' => ['required', 'string', 'min:3', 'max:2000'],
            'pemilik_risiko' => ['required', 'string', 'max:150', Rule::exists('master_pemilik_risikos', 'nama')->where('is_active', true)],
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
            'sasaran_penilaian_id' => 'Sasaran Strategis Form 2B',
            'sasaran_kustom' => 'Sasaran Strategis Kustom',
            'indikator_penilaian_id' => 'Indikator Kinerja Form 2B',
            'indikator_kustom' => 'Indikator Kinerja Kustom',
            'kategori_risiko' => 'Kategori Risiko',
            'pernyataan_risiko' => 'Pernyataan Risiko',
            'pemilik_risiko' => 'Pemilik Risiko',
            'sifat_risiko' => 'Sifat Risiko (C/UC)',
            'uraian_dampak' => 'Uraian Dampak',
            'pihak_terkena' => 'Pihak yang Terkena',
            'urutan' => 'Urutan Tampilan',
        ];
    }
}
