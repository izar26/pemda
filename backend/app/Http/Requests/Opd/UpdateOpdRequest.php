<?php

declare(strict_types=1);

namespace App\Http\Requests\Opd;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOpdRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('opd.edit') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $opd = $this->route('opd');
        $opdId = is_object($opd) ? $opd->id : $opd;

        return [
            'nama' => ['required', 'string', 'max:255'],
            'kode' => ['required', 'string', 'max:50', Rule::unique('opds', 'kode')->ignore($opdId)],
            'kategori' => ['required', 'string', 'in:Dinas,Badan,Sekretariat,Inspektorat,RSUD,Kecamatan,BUMD,DESA/KELURAHAN,Desa/Kelurahan'],
            'kepala' => ['nullable', 'string', 'max:255'],
            'urutan' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
