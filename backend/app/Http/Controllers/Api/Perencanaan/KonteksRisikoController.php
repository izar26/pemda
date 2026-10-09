<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Perencanaan;

use App\Http\Controllers\Controller;
use App\Models\Opd;
use App\Models\Perencanaan\KonteksRisikoStrategis;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\Tujuan;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KonteksRisikoController extends Controller
{
    /**
     * Get or initialize Form 2B (Penetapan Konteks Risiko Strategis OPD).
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('risiko.konteks') && !$user->can('perencanaan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk membuka Penetapan Konteks Risiko Strategis (Form 2B).');
        }

        $periodeId = $request->input('periode_id') ?? $request->input('periode_penilaian_id');
        if (!$periodeId) {
            $activePeriode = PeriodePenilaian::where('status', 'active')->first();
            $periodeId = $activePeriode?->id;
        }

        $opdId = $request->input('opd_id');
        if (!$user->hasRole('Superadmin') && $user->opd_id) {
            $opdId = $user->opd_id;
        } elseif (!$opdId) {
            $firstOpd = Opd::where('is_active', true)->orderBy('urutan')->first();
            $opdId = $firstOpd?->id;
        }

        if (!$opdId || !$periodeId) {
            return response()->json([
                'message' => 'OPD dan Periode Penilaian wajib ditentukan.',
                'data' => null,
            ], 400);
        }

        $opd = Opd::find($opdId);
        $periode = PeriodePenilaian::find($periodeId);

        // Find existing Konteks 2B
        $konteks = KonteksRisikoStrategis::with(['tujuan.sasarans.indikators'])
            ->where('periode_penilaian_id', $periodeId)
            ->where('opd_id', $opdId)
            ->first();

        // Find available Tujuans from Bapperida for this OPD and Periode
        $tujuans = Tujuan::with(['sasarans.indikators'])
            ->where('periode_penilaian_id', $periodeId)
            ->where('opd_id', $opdId)
            ->orderBy('urutan')
            ->get();

        // Find Kepala OPD
        $kepalaUser = User::where('opd_id', $opdId)
            ->where(function ($q) {
                $q->where('jabatan', 'like', '%Kepala%')
                  ->orWhere('role', 'like', '%Kepala%');
            })
            ->first();

        $defaultPejabat = [
            'nama' => $kepalaUser?->name ?? $opd?->kepala ?? 'ERI RIHANDIAR, S.T., M.T.',
            'nip' => $kepalaUser?->nip ?? '19680801 199703 1 005',
            'jabatan' => 'Kepala ' . ($opd?->nama ?? 'Perangkat Daerah'),
        ];

        return response()->json([
            'data' => [
                'konteks' => $konteks,
                'opd' => $opd,
                'periode' => $periode,
                'available_tujuans' => $tujuans,
                'pejabat_kepala' => $defaultPejabat,
            ],
        ]);
    }

    /**
     * Store or update Form 2B (Penetapan Konteks Risiko Strategis OPD).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('risiko.konteks') && !$user->can('perencanaan.renstra')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menyimpan Penetapan Konteks Risiko Strategis.');
        }

        $periodeId = $request->input('periode_id') ?? $request->input('periode_penilaian_id');
        $opdId = $request->input('opd_id');

        if (!$user->hasRole('Superadmin') && $user->opd_id) {
            $opdId = $user->opd_id;
        }

        $validated = $request->validate([
            'periode_id' => ['required', 'uuid', 'exists:periode_penilaians,id'],
            'opd_id' => ['required', 'uuid', 'exists:opds,id'],
            'sumber_data' => ['required', 'string', 'max:150'],
            'tujuan_id' => ['required', 'uuid', 'exists:tujuans,id'],
            'sasaran_ids' => ['required', 'array'],
            'sasaran_ids.*' => ['uuid'],
            'iku_ids' => ['required', 'array'],
            'iku_ids.*' => ['uuid'],
            'informasi_lain' => ['nullable', 'string'],
            'kepala_opd_nama' => ['nullable', 'string', 'max:200'],
            'kepala_opd_nip' => ['nullable', 'string', 'max:50'],
            'tanggal_penetapan' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'in:draft,final'],
        ]);

        $konteks = KonteksRisikoStrategis::updateOrCreate(
            [
                'periode_penilaian_id' => $validated['periode_id'],
                'opd_id' => $opdId,
            ],
            [
                'sumber_data' => $validated['sumber_data'],
                'tujuan_id' => $validated['tujuan_id'],
                'sasaran_ids' => $validated['sasaran_ids'],
                'iku_ids' => $validated['iku_ids'],
                'informasi_lain' => $validated['informasi_lain'] ?? '-',
                'kepala_opd_nama' => $validated['kepala_opd_nama'] ?? null,
                'kepala_opd_nip' => $validated['kepala_opd_nip'] ?? null,
                'tanggal_penetapan' => $validated['tanggal_penetapan'] ?? now()->toDateString(),
                'status' => $validated['status'] ?? 'draft',
            ]
        );

        $konteks->load(['tujuan.sasarans.indikators']);

        return response()->json([
            'message' => 'Formulir 2B (Penetapan Konteks Risiko Strategis OPD) berhasil disimpan.',
            'data' => $konteks,
        ]);
    }
}
