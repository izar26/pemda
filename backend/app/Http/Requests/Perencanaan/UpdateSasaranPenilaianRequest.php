<?php

declare(strict_types=1);

namespace App\Http\Requests\Perencanaan;

use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateSasaranPenilaianRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('tujuan.edit') ?? false;
    }

    /**
     * Prepare data before validation.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();
        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida'])) {
            $this->merge(['opd_id' => $user->opd_id]);
        } elseif (empty($this->opd_id) && !empty($this->tujuan_penilaian_id)) {
            $tujuan = TujuanPenilaian::find($this->tujuan_penilaian_id);
            if ($tujuan) {
                $this->merge(['opd_id' => $tujuan->opd_id]);
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
            'tujuan_penilaian_id' => ['sometimes', 'uuid', 'exists:tujuan_penilaians,id'],
            'opd_id' => [
                'sometimes',
                'uuid',
                Rule::exists('opds', 'id')->where('is_active', true),
            ],
            'sasaran' => ['sometimes', 'string', 'min:5', 'max:1000'],
            'kode_sasaran' => ['nullable', 'string', 'max:50'],
            'urutan' => ['nullable', 'integer', 'min:1', 'max:999'],
            'keterangan' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * Custom after validation hook for cascading integrity.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            if (!empty($this->tujuan_penilaian_id)) {
                $tujuan = TujuanPenilaian::find($this->tujuan_penilaian_id);
                if ($tujuan) {
                    $routeSasaran = $this->route('sasaran');
                    $sasaranModel = $routeSasaran instanceof SasaranPenilaian ? $routeSasaran : (is_string($routeSasaran) ? SasaranPenilaian::find($routeSasaran) : null);
                    $targetOpdId = $this->opd_id ?? $sasaranModel?->opd_id;
                    if ($targetOpdId && $tujuan->opd_id !== $targetOpdId) {
                        $validator->errors()->add('tujuan_penilaian_id', 'Tujuan strategis yang dipilih tidak berasal dari Perangkat Daerah (OPD) yang sama.');
                    }
                }
            }
        });
    }

    /**
     * Custom validation attribute names.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'tujuan_penilaian_id' => 'Tujuan Strategis Renstra',
            'opd_id' => 'Perangkat Daerah',
            'sasaran' => 'Pernyataan Sasaran',
            'kode_sasaran' => 'Kode Sasaran',
            'urutan' => 'Nomor Urut',
            'keterangan' => 'Keterangan',
        ];
    }
}
