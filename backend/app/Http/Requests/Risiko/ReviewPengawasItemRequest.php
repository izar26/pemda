<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class ReviewPengawasItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (! $user) {
            return false;
        }

        return $user->hasRole(['Superadmin', 'Admin Office'])
            || ($user->hasRole('Inspektorat') && $user->can('review_risiko.review_pengawas'));
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'form_code' => ['required', 'string', 'in:2b,2c,3a,3b,3c,rca,4,5,6'],
            'status' => ['required', 'string', 'in:approved,rejected'],
            'catatan_revisi' => ['nullable', 'string', 'required_if:status,rejected', 'min:5', 'max:2000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'form_code.required' => 'Kode formulir wajib disertakan.',
            'form_code.in' => 'Kode formulir tidak valid.',
            'status.required' => 'Status persetujuan pengawas wajib ditentukan.',
            'status.in' => 'Status harus berupa disetujui (approved) atau ditolak (rejected).',
            'catatan_revisi.required_if' => 'Catatan revisi wajib diisi minimal 5 karakter jika formulir ditolak.',
            'catatan_revisi.min' => 'Catatan revisi minimal 5 karakter.',
        ];
    }
}
