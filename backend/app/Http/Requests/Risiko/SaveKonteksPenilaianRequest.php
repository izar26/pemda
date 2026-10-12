<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class SaveKonteksPenilaianRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('konteks_risiko.create')
            || $this->user()?->can('konteks_risiko.edit')
            || false;
    }

    /**
     * Prepare data before validation.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();
        if ($user && $user->hasRole('OPD') && !$user->hasRole(['Superadmin', 'Admin Office'])) {
            $this->merge(['opd_id' => $user->opd_id]);
        }

        if (empty($this->periode_penilaian_id)) {
            $active = PeriodePenilaian::where('status', 'aktif')->first();
            if ($active) {
                $this->merge(['periode_penilaian_id' => (string) $active->id]);
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
            'periode_penilaian_id' => ['required', 'uuid', 'exists:periode_penilaians,id'],
            'opd_id' => ['required', 'uuid', 'exists:opds,id'],
            'sumber_data_id' => ['nullable', 'uuid', 'exists:master_sumber_datas,id'],
            'tujuan_penilaian_id' => ['required', 'uuid', 'exists:tujuan_penilaians,id'],
            'sasaran_ids' => ['required', 'array', 'min:1'],
            'sasaran_ids.*' => ['uuid', 'exists:sasaran_penilaians,id'],
            'indikator_ids' => ['required', 'array', 'min:1'],
            'indikator_ids.*' => ['uuid', 'exists:indikator_penilaians,id'],
            'informasi_lain' => ['nullable', 'string', 'max:5000'],
            'nama_pemda' => ['nullable', 'string', 'max:150'],
            'nama_kepala' => ['nullable', 'string', 'max:150'],
            'nip_kepala' => ['nullable', 'string', 'max:50'],
            'jabatan_kepala' => ['nullable', 'string', 'max:150'],
            'tanggal_penetapan' => ['nullable', 'date'],
            'status' => ['nullable', 'in:draft,final'],
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

            // 1. Verify Tujuan matches OPD & Periode
            $tujuan = TujuanPenilaian::find($this->tujuan_penilaian_id);
            if (!$tujuan || $tujuan->opd_id !== $this->opd_id || $tujuan->periode_penilaian_id !== $this->periode_penilaian_id) {
                $validator->errors()->add('tujuan_penilaian_id', 'Tujuan strategis yang dipilih tidak sesuai dengan OPD atau periode penilaian aktif.');
                return;
            }

            // 2. Verify all selected Sasarans belong to selected Tujuan
            $sasaranCount = SasaranPenilaian::whereIn('id', $this->sasaran_ids)
                ->where('tujuan_penilaian_id', $this->tujuan_penilaian_id)
                ->where('opd_id', $this->opd_id)
                ->count();

            if ($sasaranCount !== count(array_unique($this->sasaran_ids))) {
                $validator->errors()->add('sasaran_ids', 'Sebagian sasaran strategis yang dipilih tidak terhubung dengan tujuan strategis terpilih.');
            }

            // 3. Verify all selected Indikators belong to selected Sasarans
            $indikatorCount = IndikatorPenilaian::whereIn('id', $this->indikator_ids)
                ->whereIn('sasaran_penilaian_id', $this->sasaran_ids)
                ->where('opd_id', $this->opd_id)
                ->count();

            if ($indikatorCount !== count(array_unique($this->indikator_ids))) {
                $validator->errors()->add('indikator_ids', 'Sebagian IKU / indikator yang dipilih tidak terhubung dengan sasaran strategis yang Anda pilih.');
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
            'opd_id' => 'Perangkat Daerah',
            'sumber_data_id' => 'Sumber Data',
            'tujuan_penilaian_id' => 'Tujuan Strategis',
            'sasaran_ids' => 'Sasaran Strategis',
            'indikator_ids' => 'IKU / Indikator Renstra',
            'informasi_lain' => 'Informasi Lain',
            'nama_kepala' => 'Nama Kepala Dinas',
            'nip_kepala' => 'NIP Kepala Dinas',
            'tanggal_penetapan' => 'Tanggal Penetapan Form 2B',
        ];
    }
}
