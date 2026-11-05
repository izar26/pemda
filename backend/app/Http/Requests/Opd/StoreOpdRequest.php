<?php

declare(strict_types=1);

namespace App\Http\Requests\Opd;

use Illuminate\Foundation\Http\FormRequest;

class StoreOpdRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('opd.create') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'nama' => ['required', 'string', 'max:255'],
            'kode' => ['required', 'string', 'max:50', 'unique:opds,kode'],
            'kategori' => ['required', 'string', 'in:Dinas,Badan,Sekretariat,Inspektorat,RSUD,Kecamatan,BUMD,DESA/KELURAHAN,Desa/Kelurahan'],
            'kepala' => ['nullable', 'string', 'max:255'],
            'urutan' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
