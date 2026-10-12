<?php

declare(strict_types=1);

namespace App\Http\Requests\Perencanaan;

use App\Models\Perencanaan\SasaranPenilaian;
use Illuminate\Foundation\Http\FormRequest;

class UpdateIndikatorPenilaianRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('iku.edit') ?? false;
    }

    /**
     * Prepare data before validation.
     */
    protected function prepareForValidation(): void
    {
        if (!empty($this->sasaran_penilaian_id)) {
            $sasaran = SasaranPenilaian::find($this->sasaran_penilaian_id);
            if ($sasaran) {
                if (empty($this->opd_id)) {
                    $this->merge(['opd_id' => $sasaran->opd_id]);
                }
                if (empty($this->tujuan_penilaian_id)) {
                    $this->merge(['tujuan_penilaian_id' => $sasaran->tujuan_penilaian_id]);
                }
            }
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'sasaran_penilaian_id' => ['sometimes', 'uuid', 'exists:sasaran_penilaians,id'],
            'tujuan_penilaian_id' => ['sometimes', 'uuid', 'exists:tujuan_penilaians,id'],
            'opd_id' => ['sometimes', 'uuid', 'exists:opds,id'],
            'indikator' => ['sometimes', 'string', 'min:5', 'max:1000'],
            'jenis' => ['sometimes', 'in:IKU,Biasa'],
            'kode_indikator' => ['nullable', 'string', 'max:50'],
            'urutan' => ['nullable', 'integer', 'min:1', 'max:999'],
            'keterangan' => ['nullable', 'string', 'max:2000'],
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
            'sasaran_penilaian_id' => 'Sasaran Strategis Renstra',
            'tujuan_penilaian_id' => 'Tujuan Strategis Renstra',
            'opd_id' => 'Perangkat Daerah',
            'indikator' => 'Pernyataan Indikator / IKU',
            'jenis' => 'Jenis Indikator (IKU / Biasa)',
            'kode_indikator' => 'Kode Indikator',
            'urutan' => 'Nomor Urut',
            'keterangan' => 'Keterangan',
        ];
    }
}
