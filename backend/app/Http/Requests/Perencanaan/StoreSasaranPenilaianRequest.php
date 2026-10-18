<?php

declare(strict_types=1);

namespace App\Http\Requests\Perencanaan;

use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreSasaranPenilaianRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('tujuan.create') ?? false;
    }

    /**
     * Prepare data before validation.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();
        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office', 'Bapperida'])) {
            $this->merge(['opd_id' => $user->opd_id]);
        }

        if (empty($this->periode_penilaian_id)) {
            $active = PeriodePenilaian::where('status', 'aktif')->first();
            if ($active) {
                $this->merge(['periode_penilaian_id' => $active->id]);
            }
        }

        // Auto-resolve OPD ID from Tujuan if not provided
        if (empty($this->opd_id) && !empty($this->tujuan_penilaian_id)) {
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
            'periode_penilaian_id' => [
                'required',
                'uuid',
                Rule::exists('periode_penilaians', 'id')->where('status', 'aktif'),
            ],
            'tujuan_penilaian_id' => ['required', 'uuid', 'exists:tujuan_penilaians,id'],
            'opd_id' => [
                'required',
                'uuid',
                Rule::exists('opds', 'id')->where('is_active', true),
            ],
            'sasaran' => ['required', 'string', 'min:5', 'max:1000'],
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

            $tujuan = TujuanPenilaian::find($this->tujuan_penilaian_id);
            if (!$tujuan) {
                return;
            }

            if ($tujuan->opd_id !== $this->opd_id) {
                $validator->errors()->add('tujuan_penilaian_id', 'Tujuan strategis yang dipilih tidak berasal dari Perangkat Daerah (OPD) yang sama.');
            }

            if ($tujuan->periode_penilaian_id !== $this->periode_penilaian_id) {
                $validator->errors()->add('tujuan_penilaian_id', 'Tujuan strategis yang dipilih tidak berasal dari periode penilaian yang sama.');
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
            'periode_penilaian_id' => 'Periode Penilaian',
            'tujuan_penilaian_id' => 'Tujuan Strategis Renstra',
            'opd_id' => 'Perangkat Daerah',
            'sasaran' => 'Pernyataan Sasaran',
            'kode_sasaran' => 'Kode Sasaran',
            'urutan' => 'Nomor Urut',
            'keterangan' => 'Keterangan',
        ];
    }
}
