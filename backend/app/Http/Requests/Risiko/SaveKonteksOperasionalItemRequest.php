<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class SaveKonteksOperasionalItemRequest extends FormRequest
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
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'parent_id' => ['nullable', 'uuid', 'exists:konteks_operasional_items,id'],
            'jenis' => ['required', 'in:program,kegiatan,sub_kegiatan'],
            'kode' => ['required', 'string', 'max:50'],
            'nama' => ['required', 'string'],
            'urutan' => ['nullable', 'integer', 'min:1'],
            'indikators' => ['nullable', 'array'],
            'indikators.*.id' => ['nullable', 'uuid'],
            'indikators.*.indikator' => ['required_with:indikators', 'string'],
            'indikators.*.target' => ['required_with:indikators', 'string', 'max:100'],
            'indikators.*.satuan' => ['nullable', 'string', 'max:50'],
            'indikators.*.urutan' => ['nullable', 'integer', 'min:1'],
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
            'parent_id' => 'Parent Item (Program/Kegiatan)',
            'jenis' => 'Tingkatan Item (Program / Kegiatan / Sub-Kegiatan)',
            'kode' => 'Kode Penomoran',
            'nama' => 'Nama Program / Kegiatan / Sub-Kegiatan',
            'indikators' => 'Daftar Indikator dan Target',
        ];
    }
}
