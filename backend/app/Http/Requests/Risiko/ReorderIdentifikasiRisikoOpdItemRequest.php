<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use App\Models\Risiko\IdentifikasiRisikoOpd;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReorderIdentifikasiRisikoOpdItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user?->can('identifikasi_risiko_opd.edit')) {
            return false;
        }

        $dokumen = $this->route('dokumen');
        if (is_string($dokumen)) {
            $dokumen = IdentifikasiRisikoOpd::find($dokumen);
        }

        if ($dokumen && $user->hasRole('OPD') && ! $user->hasRole(['Superadmin', 'Admin Office'])) {
            return (string) $user->opd_id === (string) $dokumen->opd_id;
        }

        return true;
    }

    public function rules(): array
    {
        $dokumen = $this->route('dokumen');
        $dokumenId = $dokumen instanceof IdentifikasiRisikoOpd ? $dokumen->id : $dokumen;

        return [
            'item_ids' => ['required', 'array', 'min:1'],
            'item_ids.*' => [
                'required',
                'uuid',
                Rule::exists('identifikasi_risiko_opd_items', 'id')->where('identifikasi_risiko_opd_id', $dokumenId),
            ],
        ];
    }

    public function attributes(): array
    {
        return [
            'item_ids' => 'Daftar ID butir risiko strategis OPD',
            'item_ids.*' => 'ID butir risiko strategis OPD',
        ];
    }
}
