<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveAnalisisRisikoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) ($this->user()?->can('identifikasi_risiko_opd.edit') || $this->user()?->can('identifikasi_risiko_opd_operasional.edit'));
    }

    public function rules(): array
    {
        return [
            'kriteria_kemungkinan' => ['nullable', Rule::in(['Persentase Probabilitas (dlm 1 tahun)', 'Jumlah Frekuensi (dlm 1 tahun)'])],
            'inheren_kemungkinan' => ['nullable', 'integer', 'between:1,5'],
            'kriteria_dampak' => ['nullable', Rule::in(['Kerugian negara', 'Penurunan reputasi', 'Penurunan kinerja', 'Gangguan terhadap layanan organisasi', 'Tuntutan hukum'])],
            'inheren_dampak' => ['nullable', 'integer', 'between:1,5'],
            'pengendalian_ada' => ['nullable', 'boolean'],
            'pengendalian_uraian' => ['nullable', 'string', 'max:5000'],
            'sub_unsur_spip_id' => ['nullable', 'uuid', Rule::exists('master_sub_unsur_spips', 'id')->where('is_active', true)],
            'pengendalian_memadai' => ['nullable', 'boolean'],
            'residual_kemungkinan' => ['nullable', 'integer', 'between:1,5'],
            'residual_dampak' => ['nullable', 'integer', 'between:1,5'],
            'residual_kriteria_kemungkinan' => ['nullable', Rule::in(['Persentase Probabilitas (dlm 1 tahun)', 'Jumlah Frekuensi (dlm 1 tahun)'])],
            'residual_kriteria_dampak' => ['nullable', Rule::in(['Kerugian negara', 'Penurunan reputasi', 'Penurunan kinerja', 'Gangguan terhadap layanan organisasi', 'Tuntutan hukum'])],
            'rencana_tindak' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
