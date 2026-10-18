<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use App\Models\Risiko\KonteksOperasionalItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

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
            'kode' => ['nullable', 'string', 'max:50'],
            'nama' => ['required', 'string', 'max:2000'],
            'urutan' => ['nullable', 'integer', 'min:1'],
            'indikators' => ['nullable', 'array'],
            'indikators.*.id' => ['nullable', 'uuid'],
            'indikators.*.indikator' => ['required_with:indikators', 'string', 'max:2000'],
            'indikators.*.target' => ['required_with:indikators', 'string', 'max:100'],
            'indikators.*.satuan' => ['nullable', 'string', 'max:50'],
            'indikators.*.urutan' => ['nullable', 'integer', 'min:1'],
        ];
    }

    /**
     * Custom after validation hook for tree hierarchy consistency.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function ($validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $jenis = $this->jenis;
            $parentId = $this->parent_id;

            $konteksParam = $this->route('konteks') ?? $this->route('id');
            $konteksId = $konteksParam instanceof \App\Models\Risiko\KonteksOperasional ? (string) $konteksParam->id : (string) $konteksParam;

            $itemParam = $this->route('item') ?? $this->route('itemId');
            $itemId = $itemParam instanceof \App\Models\Risiko\KonteksOperasionalItem ? (string) $itemParam->id : (string) $itemParam;

            // Prevent self-referencing cycle
            if ($itemId && $parentId && (string) $parentId === (string) $itemId) {
                $validator->errors()->add('parent_id', 'Sebuah item tidak dapat menjadi induk bagi dirinya sendiri.');
                return;
            }

            // Check existing item constraints when updating
            if ($itemId) {
                $currentItem = KonteksOperasionalItem::find($itemId);
                if ($currentItem) {
                    if ($currentItem->jenis !== $jenis && $currentItem->children()->count() > 0) {
                        $validator->errors()->add('jenis', "Tingkatan '{$currentItem->jenis}' tidak dapat diubah menjadi '{$jenis}' karena sudah memiliki rincian turunan di bawahnya.");
                        return;
                    }

                    // Prevent indirect circular reference
                    if ($parentId) {
                        $isDescendant = function (string $targetId, string $possibleAncestorId, array &$visited = []) use (&$isDescendant): bool {
                            if (in_array($targetId, $visited, true)) {
                                return false;
                            }
                            $visited[] = $targetId;

                            $node = KonteksOperasionalItem::find($targetId);
                            if (!$node || !$node->parent_id) {
                                return false;
                            }
                            if ((string) $node->parent_id === (string) $possibleAncestorId) {
                                return true;
                            }
                            return $isDescendant((string) $node->parent_id, $possibleAncestorId, $visited);
                        };

                        if ($isDescendant((string) $parentId, (string) $itemId)) {
                            $validator->errors()->add('parent_id', 'Induk yang dipilih tidak boleh merupakan rincian turunan dari item ini.');
                            return;
                        }
                    }
                }
            }

            if ($jenis === 'program') {
                if (!empty($parentId)) {
                    $validator->errors()->add('parent_id', 'Tingkatan Program adalah tingkat tertinggi dan tidak boleh memiliki induk (parent).');
                }
            } elseif ($jenis === 'kegiatan') {
                if (empty($parentId)) {
                    $validator->errors()->add('parent_id', 'Tingkatan Kegiatan wajib memilih Program sebagai induk (parent).');
                } else {
                    $parent = KonteksOperasionalItem::find($parentId);
                    if ($parent) {
                        if ($konteksId && (string) $parent->konteks_operasional_id !== (string) $konteksId) {
                            $validator->errors()->add('parent_id', 'Induk yang dipilih tidak berada dalam dokumen Konteks Operasional yang sama.');
                        } elseif ($parent->jenis !== 'program') {
                            $validator->errors()->add('parent_id', 'Induk dari sebuah Kegiatan harus berupa Program.');
                        }
                    }
                }
            } elseif ($jenis === 'sub_kegiatan') {
                if (empty($parentId)) {
                    $validator->errors()->add('parent_id', 'Tingkatan Sub-Kegiatan wajib memilih Kegiatan sebagai induk (parent).');
                } else {
                    $parent = KonteksOperasionalItem::find($parentId);
                    if ($parent) {
                        if ($konteksId && (string) $parent->konteks_operasional_id !== (string) $konteksId) {
                            $validator->errors()->add('parent_id', 'Induk yang dipilih tidak berada dalam dokumen Konteks Operasional yang sama.');
                        } elseif ($parent->jenis !== 'kegiatan') {
                            $validator->errors()->add('parent_id', 'Induk dari sebuah Sub-Kegiatan harus berupa Kegiatan.');
                        }
                    }
                }
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
            'parent_id' => 'Parent Item (Program/Kegiatan)',
            'jenis' => 'Tingkatan Item (Program / Kegiatan / Sub-Kegiatan)',
            'kode' => 'Kode Penomoran',
            'nama' => 'Nama Program / Kegiatan / Sub-Kegiatan',
            'indikators' => 'Daftar Indikator dan Target',
        ];
    }
}
