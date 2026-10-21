<?php

declare(strict_types=1);

namespace App\Http\Requests\Pengawasan;

use App\Models\Pengawasan\AuditorOpdAssignment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAuditorAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('penugasan_auditor.edit') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
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
            'opd_ids.required' => 'Minimal pilih 1 Perangkat Daerah (OPD).',
            'opd_ids.min' => 'Minimal pilih 1 Perangkat Daerah (OPD).',
            'opd_ids.*.exists' => 'Salah satu OPD yang dipilih tidak ditemukan.',
            'tanggal_selesai.after_or_equal' => 'Tanggal selesai penugasan harus sama atau setelah tanggal mulai.',
        ];
    }

    /**
     * Validate 1 OPD can only be assigned to 1 Auditor.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $opdIds = (array) $this->input('opd_ids', []);
            $auditorId = (string) ($this->route('auditorId') ?? $this->route('auditor'));

            if (!empty($opdIds)) {
                $alreadyAssigned = AuditorOpdAssignment::whereIn('opd_id', $opdIds)
                    ->where('auditor_id', '!=', $auditorId)
                    ->with(['opd:id,nama', 'auditor:id,name'])
                    ->first();

                if ($alreadyAssigned) {
                    $opdName = $alreadyAssigned->opd?->nama ?? 'Perangkat Daerah';
                    $auditorName = $alreadyAssigned->auditor?->name ?? 'auditor lain';
                    $validator->errors()->add(
                        'opd_ids',
                        "OPD \"{$opdName}\" sudah ditugaskan kepada auditor {$auditorName}. Satu OPD hanya dapat ditugaskan ke 1 auditor."
                    );
                }
            }
        });
    }
}
