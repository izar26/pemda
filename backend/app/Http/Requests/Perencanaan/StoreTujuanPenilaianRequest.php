<?php

declare(strict_types=1);

namespace App\Http\Requests\Perencanaan;

use App\Models\Perencanaan\PeriodePenilaian;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTujuanPenilaianRequest extends FormRequest
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
            'opd_id' => [
                'required',
                'uuid',
                Rule::exists('opds', 'id')->where('is_active', true),
            ],
            'sumber_data_id' => [
                'required',
                'uuid',
                Rule::exists('master_sumber_datas', 'id')->where('is_active', true),
            ],
            'kode_tujuan' => ['nullable', 'string', 'max:50'],
            'tujuan' => ['required', 'string', 'min:5', 'max:1000'],
            'urutan' => ['nullable', 'integer', 'min:1', 'max:999'],
            'keterangan' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * Custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'periode_penilaian_id.required' => 'Periode penilaian aktif tidak ditemukan. Pastikan ada periode yang aktif.',
            'periode_penilaian_id.exists' => 'Periode penilaian tidak valid atau tidak berstatus aktif.',
            'opd_id.required' => 'Perangkat Daerah (OPD) wajib dipilih.',
            'opd_id.exists' => 'Perangkat Daerah yang dipilih tidak valid atau berstatus nonaktif.',
            'sumber_data_id.required' => 'Sumber Data perencanaan wajib dipilih.',
            'sumber_data_id.exists' => 'Sumber data yang dipilih tidak valid atau berstatus nonaktif.',
            'tujuan.required' => 'Pernyataan tujuan strategis wajib diisi.',
            'tujuan.min' => 'Pernyataan tujuan minimal 5 karakter.',
            'tujuan.max' => 'Pernyataan tujuan maksimal 1000 karakter.',
        ];
    }
}
