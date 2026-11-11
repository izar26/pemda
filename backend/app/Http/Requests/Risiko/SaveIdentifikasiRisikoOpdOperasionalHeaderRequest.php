<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use App\Models\Perencanaan\PeriodePenilaian;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveIdentifikasiRisikoOpdOperasionalHeaderRequest extends FormRequest
{
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
     * Prepare data before validation.
     */
    protected function prepareForValidation(): void
    {
        $user = $this->user();
        if ($user && $user->hasRole('OPD') && ! $user->hasRole(['Superadmin', 'Admin Office'])) {
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
     * @return array<string, ValidationRule|array<mixed>|string>
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
            'master_urusan_pemerintahan_id' => [
                'required',
                'uuid',
                Rule::exists('master_urusan_pemerintahans', 'id')->where('is_active', true),
            ],
            'nama_pemda' => ['nullable', 'string', 'max:150'],
            'singkatan_opd' => ['nullable', 'string', 'max:50'],
            'nama_kepala_opd' => ['nullable', 'string', 'max:255'],
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
            'master_urusan_pemerintahan_id' => 'Urusan Pemerintahan',
            'nama_pemda' => 'Nama Pemda',
            'singkatan_opd' => 'Singkatan OPD',
            'nama_kepala_opd' => 'Nama Kepala OPD',
        ];
    }
}
