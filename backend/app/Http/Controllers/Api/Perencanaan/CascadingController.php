<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Perencanaan;

use App\Http\Controllers\Controller;
use App\Models\Perencanaan\IndikatorSasaran;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\Sasaran;
use App\Models\Perencanaan\Tujuan;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CascadingController extends Controller
{
    /**
     * Get 3-level Cascading hierarchy tree (Tujuan -> Sasaran -> Indikator).
     */
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('perencanaan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data cascading.');
        }

        $opdId = $request->input('opd_id');
        $periodeId = $request->input('periode_penilaian_id') ?? $request->input('periode_id');

        if (!$periodeId) {
            $activePeriode = PeriodePenilaian::where('status', 'active')->first();
            $periodeId = $activePeriode?->id;
        }

        $query = Tujuan::with(['opd', 'sasarans.indikators']);

        if ($periodeId) {
            $query->where('periode_penilaian_id', $periodeId);
        }

        if ($opdId && $opdId !== 'all') {
            $query->where('opd_id', $opdId);
        }

        if ($request->filled('search')) {
            $term = trim((string) $request->input('search'));
            $query->where(function ($q) use ($term) {
                $q->where('tujuan', 'like', "%{$term}%")
                  ->orWhere('nomor', 'like', "%{$term}%")
                  ->orWhereHas('sasarans', function ($sq) use ($term) {
                      $sq->where('sasaran', 'like', "%{$term}%")
                        ->orWhereHas('indikators', function ($iq) use ($term) {
                            $iq->where('indikator', 'like', "%{$term}%");
                        });
                  });
            });
        }

        $tujuans = $query->orderBy('urutan', 'asc')->orderBy('id', 'asc')->get();

        return response()->json([
            'data' => $tujuans,
        ]);
    }

    // --- 1. TUJUAN CRUD ---
    public function storeTujuan(Request $request): JsonResponse
    {
        if (!$request->user()->can('perencanaan.cascading')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak menambahkan Tujuan Kinerja.');
        }

        if ($request->has('periode_id') && !$request->has('periode_penilaian_id')) {
            $request->merge(['periode_penilaian_id' => $request->input('periode_id')]);
        }

        $opdId = $request->input('opd_id');
        $periodeId = $request->input('periode_penilaian_id');

        if (!$request->filled('nomor')) {
            $count = Tujuan::where('opd_id', $opdId)->where('periode_penilaian_id', $periodeId)->count();
            $request->merge(['nomor' => 'T.' . ($count + 1)]);
        }

        $validated = $request->validate([
            'periode_penilaian_id' => ['required', 'uuid', 'exists:periode_penilaians,id'],
            'opd_id' => ['required', 'uuid', 'exists:opds,id'],
            'nomor' => ['required', 'string', 'max:20'],
            'tujuan' => ['required', 'string'],
            'urutan' => ['nullable', 'integer'],
        ]);

        $validated['urutan'] = $validated['urutan'] ?? ((int) Tujuan::where('opd_id', $validated['opd_id'])->max('urutan')) + 1;

        $tujuan = Tujuan::create($validated);
        $tujuan->load(['opd', 'sasarans.indikators']);

        return response()->json([
            'message' => 'Tujuan kinerja makro berhasil ditambahkan.',
            'data' => $tujuan,
        ], 201);
    }

    public function updateTujuan(Request $request, Tujuan $tujuan): JsonResponse
    {
        if (!$request->user()->can('perencanaan.cascading')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak mengubah Tujuan Kinerja.');
        }

        $validated = $request->validate([
            'opd_id' => ['nullable', 'uuid', 'exists:opds,id'],
            'nomor' => ['nullable', 'string', 'max:20'],
            'tujuan' => ['required', 'string'],
            'urutan' => ['nullable', 'integer'],
        ]);

        $tujuan->update(array_filter($validated, fn($val) => $val !== null));
        $tujuan->load(['opd', 'sasarans.indikators']);

        return response()->json([
            'message' => 'Tujuan kinerja makro berhasil diperbarui.',
            'data' => $tujuan,
        ]);
    }

    public function destroyTujuan(Request $request, Tujuan $tujuan): JsonResponse
    {
        if (!$request->user()->can('perencanaan.cascading')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak menghapus Tujuan Kinerja.');
        }

        $tujuan->delete();

        return response()->json([
            'message' => 'Tujuan kinerja makro beserta sasaran dan indikator terkait berhasil dihapus.',
        ]);
    }

    // --- 2. SASARAN CRUD ---
    public function storeSasaran(Request $request): JsonResponse
    {
        if (!$request->user()->can('perencanaan.cascading')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak menambahkan Sasaran Kinerja.');
        }

        if ($request->has('periode_id') && !$request->has('periode_penilaian_id')) {
            $request->merge(['periode_penilaian_id' => $request->input('periode_id')]);
        }

        $tujuanId = $request->input('tujuan_id');
        $parentTujuan = Tujuan::find($tujuanId);

        if ($parentTujuan && !$request->filled('periode_penilaian_id')) {
            $request->merge(['periode_penilaian_id' => $parentTujuan->periode_penilaian_id]);
        }

        if (!$request->filled('nomor')) {
            $prefix = $parentTujuan?->nomor ? str_replace('T.', 'S.', $parentTujuan->nomor) : 'S.1';
            $count = Sasaran::where('tujuan_id', $tujuanId)->count();
            $request->merge(['nomor' => $prefix . '.' . ($count + 1)]);
        }

        $validated = $request->validate([
            'tujuan_id' => ['required', 'uuid', 'exists:tujuans,id'],
            'periode_penilaian_id' => ['required', 'uuid', 'exists:periode_penilaians,id'],
            'nomor' => ['required', 'string', 'max:20'],
            'sasaran' => ['required', 'string'],
            'urutan' => ['nullable', 'integer'],
        ]);

        $validated['urutan'] = $validated['urutan'] ?? ((int) Sasaran::where('tujuan_id', $validated['tujuan_id'])->max('urutan')) + 1;

        $sasaran = Sasaran::create($validated);
        $sasaran->load('indikators');

        return response()->json([
            'message' => 'Sasaran strategis berhasil ditambahkan.',
            'data' => $sasaran,
        ], 201);
    }

    public function updateSasaran(Request $request, Sasaran $sasaran): JsonResponse
    {
        if (!$request->user()->can('perencanaan.cascading')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak mengubah Sasaran Kinerja.');
        }

        $validated = $request->validate([
            'nomor' => ['nullable', 'string', 'max:20'],
            'sasaran' => ['required', 'string'],
            'urutan' => ['nullable', 'integer'],
        ]);

        $sasaran->update(array_filter($validated, fn($val) => $val !== null));
        $sasaran->load('indikators');

        return response()->json([
            'message' => 'Sasaran strategis berhasil diperbarui.',
            'data' => $sasaran,
        ]);
    }

    public function destroySasaran(Request $request, Sasaran $sasaran): JsonResponse
    {
        if (!$request->user()->can('perencanaan.cascading')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak menghapus Sasaran Kinerja.');
        }

        $sasaran->delete();

        return response()->json([
            'message' => 'Sasaran strategis berhasil dihapus.',
        ]);
    }

    // --- 3. INDIKATOR CRUD ---
    public function storeIndikator(Request $request): JsonResponse
    {
        if (!$request->user()->can('perencanaan.cascading')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak menambahkan Indikator Sasaran.');
        }

        if ($request->has('periode_id') && !$request->has('periode_penilaian_id')) {
            $request->merge(['periode_penilaian_id' => $request->input('periode_id')]);
        }

        $sasaranId = $request->input('sasaran_id');
        $parentSasaran = Sasaran::find($sasaranId);

        if ($parentSasaran && !$request->filled('periode_penilaian_id')) {
            $request->merge(['periode_penilaian_id' => $parentSasaran->periode_penilaian_id]);
        }

        // Normalize jenis (IKU / Utama -> 'utama', Biasa / Pendukung -> 'pendukung')
        $jenisInput = strtolower(trim((string) $request->input('jenis', 'utama')));
        $request->merge(['jenis' => in_array($jenisInput, ['pendukung', 'biasa'], true) ? 'pendukung' : 'utama']);

        if (!$request->filled('nomor')) {
            $prefix = $parentSasaran?->nomor ? str_replace('S.', 'I.', $parentSasaran->nomor) : 'I.1.1';
            $count = IndikatorSasaran::where('sasaran_id', $sasaranId)->count();
            $request->merge(['nomor' => $prefix . '.' . ($count + 1)]);
        }

        $validated = $request->validate([
            'sasaran_id' => ['required', 'uuid', 'exists:sasarans,id'],
            'periode_penilaian_id' => ['required', 'uuid', 'exists:periode_penilaians,id'],
            'nomor' => ['required', 'string', 'max:20'],
            'indikator' => ['required', 'string'],
            'jenis' => ['required', 'string', 'in:utama,pendukung'],
            'satuan' => ['nullable', 'string', 'max:50'],
            'target' => ['nullable', 'string', 'max:100'],
            'urutan' => ['nullable', 'integer'],
        ]);

        $validated['urutan'] = $validated['urutan'] ?? ((int) IndikatorSasaran::where('sasaran_id', $validated['sasaran_id'])->max('urutan')) + 1;

        $indikator = IndikatorSasaran::create($validated);

        return response()->json([
            'message' => 'Indikator kinerja sasaran berhasil ditambahkan.',
            'data' => $indikator,
        ], 201);
    }

    public function updateIndikator(Request $request, IndikatorSasaran $indikator): JsonResponse
    {
        if (!$request->user()->can('perencanaan.cascading')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak mengubah Indikator Sasaran.');
        }

        if ($request->has('jenis')) {
            $jenisInput = strtolower(trim((string) $request->input('jenis')));
            $request->merge(['jenis' => in_array($jenisInput, ['pendukung', 'biasa'], true) ? 'pendukung' : 'utama']);
        }

        $validated = $request->validate([
            'nomor' => ['nullable', 'string', 'max:20'],
            'indikator' => ['required', 'string'],
            'jenis' => ['nullable', 'string', 'in:utama,pendukung'],
            'satuan' => ['nullable', 'string', 'max:50'],
            'target' => ['nullable', 'string', 'max:100'],
            'urutan' => ['nullable', 'integer'],
        ]);

        $indikator->update(array_filter($validated, fn($val) => $val !== null));

        return response()->json([
            'message' => 'Indikator kinerja sasaran berhasil diperbarui.',
            'data' => $indikator,
        ]);
    }

    public function destroyIndikator(Request $request, IndikatorSasaran $indikator): JsonResponse
    {
        if (!$request->user()->can('perencanaan.cascading')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak menghapus Indikator Sasaran.');
        }

        $indikator->delete();

        return response()->json([
            'message' => 'Indikator kinerja sasaran berhasil dihapus.',
        ]);
    }

    /**
     * Copy / Clone cascading data from previous period (Fitur No 14, 15, 16, 17 Sheet 2).
     */
    public function clone(Request $request): JsonResponse
    {
        if (!$request->user()->can('perencanaan.cascading')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak menyalin data Cascading.');
        }

        $validated = $request->validate([
            'source_periode_id' => ['required', 'uuid', 'exists:periode_penilaians,id'],
            'target_periode_id' => ['required', 'uuid', 'exists:periode_penilaians,id', 'different:source_periode_id'],
            'opd_id' => ['nullable', 'string'],
        ]);

        $sourceId = $validated['source_periode_id'];
        $targetId = $validated['target_periode_id'];
        $opdId = $validated['opd_id'] ?? null;

        $query = Tujuan::with(['sasarans.indikators'])->where('periode_penilaian_id', $sourceId);
        if ($opdId && $opdId !== 'all') {
            $query->where('opd_id', $opdId);
        }
        $sourceTujuans = $query->get();

        if ($sourceTujuans->isEmpty()) {
            return response()->json([
                'message' => 'Tidak ditemukan data cascading pada periode sumber yang dipilih.',
                'cloned_count' => 0,
            ], 422);
        }

        $clonedTujuan = 0;
        $clonedSasaran = 0;
        $clonedIndikator = 0;

        DB::transaction(function () use ($sourceTujuans, $targetId, &$clonedTujuan, &$clonedSasaran, &$clonedIndikator) {
            foreach ($sourceTujuans as $srcTujuan) {
                $newTujuan = Tujuan::create([
                    'periode_penilaian_id' => $targetId,
                    'opd_id' => $srcTujuan->opd_id,
                    'nomor' => $srcTujuan->nomor,
                    'tujuan' => $srcTujuan->tujuan,
                    'urutan' => $srcTujuan->urutan,
                ]);
                $clonedTujuan++;

                foreach ($srcTujuan->sasarans as $srcSasaran) {
                    $newSasaran = Sasaran::create([
                        'tujuan_id' => $newTujuan->id,
                        'periode_penilaian_id' => $targetId,
                        'nomor' => $srcSasaran->nomor,
                        'sasaran' => $srcSasaran->sasaran,
                        'urutan' => $srcSasaran->urutan,
                    ]);
                    $clonedSasaran++;

                    foreach ($srcSasaran->indikators as $srcIndikator) {
                        IndikatorSasaran::create([
                            'sasaran_id' => $newSasaran->id,
                            'periode_penilaian_id' => $targetId,
                            'nomor' => $srcIndikator->nomor,
                            'indikator' => $srcIndikator->indikator,
                            'jenis' => $srcIndikator->jenis,
                            'satuan' => $srcIndikator->satuan,
                            'target' => $srcIndikator->target,
                            'urutan' => $srcIndikator->urutan,
                        ]);
                        $clonedIndikator++;
                    }
                }
            }
        });

        $srcPeriode = PeriodePenilaian::find($sourceId);
        $tgtPeriode = PeriodePenilaian::find($targetId);
        app(AuditLogService::class)->log(
            action: 'CASCADING_CLONE',
            module: 'Perencanaan Kinerja',
            description: "Menduplikasi pohon kinerja dari periode {$srcPeriode?->periode_penilaian} ke {$tgtPeriode?->periode_penilaian} (Total: {$clonedTujuan} Tujuan, {$clonedSasaran} Sasaran, {$clonedIndikator} Indikator)",
            user: $request->user(),
            context: [
                'source_periode_id' => $sourceId,
                'source_periode' => $srcPeriode?->periode_penilaian,
                'target_periode_id' => $targetId,
                'target_periode' => $tgtPeriode?->periode_penilaian,
                'opd_id' => $opdId,
                'tujuan_count' => $clonedTujuan,
                'sasaran_count' => $clonedSasaran,
                'indikator_count' => $clonedIndikator,
            ]
        );

        return response()->json([
            'message' => "Berhasil menyalin {$clonedTujuan} Tujuan, {$clonedSasaran} Sasaran, dan {$clonedIndikator} Indikator ke periode target.",
            'data' => [
                'tujuans_count' => $clonedTujuan,
                'sasarans_count' => $clonedSasaran,
                'indikators_count' => $clonedIndikator,
            ],
        ]);
    }
}

