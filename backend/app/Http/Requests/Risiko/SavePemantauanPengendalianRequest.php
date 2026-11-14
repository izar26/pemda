<?php

declare(strict_types=1);

namespace App\Http\Requests\Risiko;

use Illuminate\Foundation\Http\FormRequest;

class SavePemantauanPengendalianRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) ($this->user()?->can('identifikasi_risiko_opd.edit') || $this->user()?->can('identifikasi_risiko_opd_operasional.edit'));
    }

    public function rules(): array
    {
        return [
            'bentuk_pemantauan' => ['nullable', 'string', 'max:5000'],
            'penanggung_jawab_pemantauan' => ['nullable', 'string', 'max:5000'],
            'rencana_waktu_pemantauan' => ['nullable', 'string', 'max:5000'],
            'realisasi_waktu_pemantauan' => ['nullable', 'string', 'max:5000'],
            'keterangan' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
