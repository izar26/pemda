<?php

declare(strict_types=1);

namespace App\Http\Requests\Pengawasan;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAuditorAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('penugasan_auditor.create') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'auditor_id' => [
                'required',
                'uuid',
                Rule::exists('users', 'id'),
            ],
            'opd_ids' => ['required', 'array', 'min:1'],
            'opd_ids.*' => [
                'required',
                'uuid',
                Rule::exists('opds', 'id'),
            ],
            'periode_penilaian_id' => [
                'nullable',
                'uuid',
                Rule::exists('periode_penilaians', 'id'),
            ],
            'nomor_surat_tugas' => ['nullable', 'string', 'max:100'],
            'tanggal_mulai' => ['nullable', 'date'],
            'tanggal_selesai' => ['nullable', 'date', 'after_or_equal:tanggal_mulai'],
            'catatan' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'auditor_id.required' => 'Auditor wajib dipilih.',
            'auditor_id.exists' => 'Auditor yang dipilih tidak valid.',
            'opd_ids.required' => 'Minimal pilih 1 Perangkat Daerah (OPD).',
            'opd_ids.min' => 'Minimal pilih 1 Perangkat Daerah (OPD).',
            'opd_ids.*.exists' => 'Salah satu OPD yang dipilih tidak ditemukan.',
            'tanggal_selesai.after_or_equal' => 'Tanggal selesai penugasan harus sama atau setelah tanggal mulai.',
        ];
    }
}
