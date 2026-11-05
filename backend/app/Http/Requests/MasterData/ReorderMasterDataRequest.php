<?php

declare(strict_types=1);

namespace App\Http\Requests\MasterData;

use App\Http\Controllers\Api\MasterDataController;
use Illuminate\Foundation\Http\FormRequest;

class ReorderMasterDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('master.edit') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $entity = (string) $this->route('entity');
        $config = MasterDataController::ENTITY_CONFIG[$entity] ?? null;
        $table = $config['table'] ?? '';

        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'string', 'uuid', "exists:{$table},id"],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'ids.required' => 'Daftar ID data yang akan diurutkan wajib diisi.',
            'ids.array' => 'Format daftar ID tidak valid.',
            'ids.min' => 'Minimal pilih 1 data untuk diurutkan.',
            'ids.*.required' => 'ID data tidak boleh kosong.',
            'ids.*.uuid' => 'Format ID data tidak valid.',
            'ids.*.exists' => 'Salah satu data yang dipilih tidak ditemukan pada sistem.',
        ];
    }
}
