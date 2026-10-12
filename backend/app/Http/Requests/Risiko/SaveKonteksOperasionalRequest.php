<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use App\Models\Perencanaan\PeriodePenilaian;
use Illuminate\Foundation\Http\FormRequest;

class SaveKonteksOperasionalRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('konteks_operasional.create')
            || $this->user()?->can('konteks_operasional.edit')
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
            'informasi_lain' => ['nullable', 'string', 'max:5000'],
            'nama_pemda' => ['nullable', 'string', 'max:150'],
            'nama_kepala' => ['nullable', 'string', 'max:150'],
            'nip_kepala' => ['nullable', 'string', 'max:50'],
            'jabatan_kepala' => ['nullable', 'string', 'max:150'],
            'tanggal_penetapan' => ['nullable', 'date'],
            'status' => ['nullable', 'in:draft,final'],

            // Optional batch items payload
            'items' => ['nullable', 'array'],
            'items.*.jenis' => ['required_with:items', 'in:program,kegiatan,sub_kegiatan'],
            'items.*.kode' => ['required_with:items', 'string', 'max:50'],
            'items.*.nama' => ['required_with:items', 'string'],
            'items.*.parent_kode' => ['nullable', 'string', 'max:50'],
            'items.*.urutan' => ['nullable', 'integer', 'min:1'],
            'items.*.indikators' => ['nullable', 'array'],
            'items.*.indikators.*.indikator' => ['required_with:items.*.indikators', 'string'],
            'items.*.indikators.*.target' => ['required_with:items.*.indikators', 'string', 'max:100'],
            'items.*.indikators.*.satuan' => ['nullable', 'string', 'max:50'],
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
            'periode_penilaian_id' => 'Periode Penilaian',
            'opd_id' => 'Perangkat Daerah',
            'sumber_data_id' => 'Sumber Data',
            'informasi_lain' => 'Informasi Lain',
            'nama_kepala' => 'Nama Kepala Dinas',
            'nip_kepala' => 'NIP Kepala Dinas',
            'tanggal_penetapan' => 'Tanggal Penetapan Form 2C',
            'status' => 'Status Dokumen',
        ];
    }
}
