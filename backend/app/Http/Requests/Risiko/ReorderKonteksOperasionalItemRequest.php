<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use App\Models\Risiko\KonteksOperasional;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReorderKonteksOperasionalItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user?->can('konteks_operasional.edit')) {
            return false;
        }

        $konteks = $this->route('konteks');
        if (is_string($konteks)) {
            $konteks = KonteksOperasional::find($konteks);
        }

        if ($konteks && $user->hasRole('OPD') && ! $user->hasRole(['Superadmin', 'Admin Office'])) {
            return (string) $user->opd_id === (string) $konteks->opd_id;
        }

        return true;
    }

    public function rules(): array
    {
        $konteks = $this->route('konteks');
        $konteksId = $konteks instanceof KonteksOperasional ? $konteks->id : $konteks;

        $existsRule = Rule::exists('konteks_operasional_items', 'id')->where('konteks_operasional_id', $konteksId);

        if ($this->has('ids')) {
            return [
                'ids' => ['required', 'array', 'min:1'],
                'ids.*' => ['required', 'uuid', $existsRule],
            ];
        }

        return [
            'item_ids' => ['required', 'array', 'min:1'],
            'item_ids.*' => ['required', 'uuid', $existsRule],
        ];
    }

    public function attributes(): array
    {
        return [
            'item_ids' => 'Daftar ID butir operasional',
            'item_ids.*' => 'ID butir operasional',
        ];
    }
}
