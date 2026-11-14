<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class SaveKomunikasiPengendalianRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) ($this->user()?->can('identifikasi_risiko_opd.edit') || $this->user()?->can('identifikasi_risiko_opd_operasional.edit'));
    }

    public function rules(): array
    {
        return [
            'media_komunikasi' => ['nullable', 'string', 'max:5000'],
            'penyedia_informasi' => ['nullable', 'string', 'max:5000'],
            'penerima_informasi' => ['nullable', 'string', 'max:5000'],
            'rencana_waktu' => ['nullable', 'string', 'max:5000'],
            'realisasi_waktu' => ['nullable', 'string', 'max:5000'],
            'keterangan' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
