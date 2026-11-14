<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use App\Models\Risiko\IdentifikasiRisikoPemda;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReorderIdentifikasiRisikoPemdaItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user?->can('identifikasi_risiko_pemda.edit')) {
            return false;
        }

        $dokumen = $this->route('dokumen');
        if (is_string($dokumen)) {
            $dokumen = IdentifikasiRisikoPemda::find($dokumen);
        }

        if ($dokumen && $user->hasRole('OPD') && ! $user->hasRole(['Superadmin', 'Admin Office'])) {
            return (string) $user->opd_id === (string) $dokumen->opd_id;
        }

        return true;
    }

    public function rules(): array
    {
        $dokumen = $this->route('dokumen');
        $dokumenId = $dokumen instanceof IdentifikasiRisikoPemda ? $dokumen->id : $dokumen;

        return [
            'item_ids' => ['required', 'array', 'min:1'],
            'item_ids.*' => [
                'required',
                'uuid',
                Rule::exists('identifikasi_risiko_pemda_items', 'id')->where('identifikasi_risiko_pemda_id', $dokumenId),
            ],
        ];
    }

    public function attributes(): array
    {
        return [
            'item_ids' => 'Daftar ID butir risiko Pemda',
            'item_ids.*' => 'ID butir risiko Pemda',
        ];
    }
}
