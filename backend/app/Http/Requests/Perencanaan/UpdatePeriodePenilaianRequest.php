<?php

declare(strict_types=1);

namespace App\Http\Requests\Perencanaan;

use App\Models\Perencanaan\PeriodePenilaian;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdatePeriodePenilaianRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('periode.edit') ?? false;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $tahunMulai = (int) $this->input('tahun_mulai');
        $tahunAkhir = (int) $this->input('tahun_akhir');

        if ($tahunMulai && !$this->filled('tahun_akhir')) {
            $tahunAkhir = $tahunMulai + 4;
            $this->merge(['tahun_akhir' => $tahunAkhir]);
        }

        if (!$this->filled('nama_periode') && $tahunMulai && $tahunAkhir) {
            $this->merge(['nama_periode' => "RPJMD {$tahunMulai} - {$tahunAkhir}"]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'nama_periode' => ['nullable', 'string', 'max:100'],
            'tahun_mulai' => ['required', 'integer', 'min:2000', 'max:2100'],
            'tahun_akhir' => ['required', 'integer', 'gte:tahun_mulai', 'max:2100'],
            'tahun_penilaian' => ['required', 'integer'],
            'tanggal_mulai' => ['required', 'date_format:Y-m-d'],
            'tanggal_akhir' => ['required', 'date_format:Y-m-d', 'after_or_equal:tanggal_mulai'],
            'status' => ['required', 'string', 'in:aktif,tidak_aktif,arsip'],
            'keterangan' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * Configure the validator instance with cross-field business logic checks.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $tahunMulai = (int) $this->input('tahun_mulai');
            $tahunAkhir = (int) $this->input('tahun_akhir');
            $tahunPenilaian = (int) $this->input('tahun_penilaian');
            $tanggalMulai = $this->input('tanggal_mulai');
            $tanggalAkhir = $this->input('tanggal_akhir');
            $status = (string) $this->input('status');

            $currentPeriode = $this->route('periode');
            $currentId = $currentPeriode instanceof PeriodePenilaian ? $currentPeriode->id : $currentPeriode;

            // 1. Validate exact 5-year cycle (tahun_akhir - tahun_mulai === 4)
            if ($tahunMulai && $tahunAkhir) {
                if ($tahunAkhir - $tahunMulai !== 4) {
                    $expectedEnd = $tahunMulai + 4;
                    $v->errors()->add(
                        'tahun_akhir',
                        "Rentang periode RPJMD harus tepat 5 tahun (misal: {$tahunMulai} - {$expectedEnd})."
                    );
                }
            }

            // 2. Validate tahun_penilaian is within [tahun_mulai, tahun_akhir]
            if ($tahunMulai && $tahunAkhir && $tahunPenilaian) {
                if ($tahunPenilaian < $tahunMulai || $tahunPenilaian > $tahunAkhir) {
                    $v->errors()->add(
                        'tahun_penilaian',
                        "Tahun penilaian ({$tahunPenilaian}) harus berada di dalam rentang periode RPJMD ({$tahunMulai} - {$tahunAkhir})."
                    );
                }
            }

            // 3. Validate uniqueness: tahun_penilaian cannot collide with another non-archived period
            if ($tahunPenilaian && $status !== 'arsip') {
                $collision = PeriodePenilaian::where('tahun_penilaian', $tahunPenilaian)
                    ->where('status', '!=', 'arsip')
                    ->when($currentId, fn($q) => $q->where('id', '!=', $currentId))
                    ->exists();

                if ($collision) {
                    $v->errors()->add(
                        'tahun_penilaian',
                        "Tahun penilaian {$tahunPenilaian} sudah digunakan pada periode aktif/draft lain. Satu tahun anggaran hanya dapat memiliki 1 siklus penilaian."
                    );
                }
            }

            // 4. Validate that start and end dates strictly align with tahun_penilaian
            if ($tanggalMulai && $tahunPenilaian) {
                try {
                    $startYear = Carbon::parse($tanggalMulai)->year;
                    if ($startYear !== $tahunPenilaian) {
                        $v->errors()->add(
                            'tanggal_mulai',
                            "Tahun pada tanggal mulai ({$startYear}) harus sesuai dengan tahun penilaian ({$tahunPenilaian})."
                        );
                    }
                } catch (\Throwable) {
                    // Handled by date format rule
                }
            }

            if ($tanggalAkhir && $tahunPenilaian) {
                try {
                    $endYear = Carbon::parse($tanggalAkhir)->year;
                    if ($endYear !== $tahunPenilaian) {
                        $v->errors()->add(
                            'tanggal_akhir',
                            "Tahun pada tanggal berakhir ({$endYear}) harus sesuai dengan tahun penilaian ({$tahunPenilaian})."
                        );
                    }
                } catch (\Throwable) {
                    // Handled by date format rule
                }
            }
        });
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'tahun_mulai.required' => 'Tahun mulai periode wajib diisi.',
            'tahun_akhir.required' => 'Tahun akhir periode wajib diisi.',
            'tahun_akhir.gte' => 'Tahun akhir periode tidak boleh lebih kecil dari tahun mulai.',
            'tahun_penilaian.required' => 'Tahun penilaian berjalan wajib dipilih.',
            'tanggal_mulai.required' => 'Tanggal mulai penilaian wajib diisi.',
            'tanggal_mulai.date_format' => 'Format tanggal mulai harus berupa YYYY-MM-DD.',
            'tanggal_akhir.required' => 'Tanggal batas akhir penilaian wajib diisi.',
            'tanggal_akhir.date_format' => 'Format tanggal batas akhir harus berupa YYYY-MM-DD.',
            'tanggal_akhir.after_or_equal' => 'Tanggal batas akhir harus sama dengan atau setelah tanggal mulai.',
            'status.in' => 'Status periode harus bernilai aktif, tidak_aktif, atau arsip.',
        ];
    }
}
