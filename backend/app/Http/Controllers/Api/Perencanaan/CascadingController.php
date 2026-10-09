<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Perencanaan;

use App\Http\Controllers\Controller;
use App\Models\Perencanaan\IndikatorSasaran;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\Sasaran;
use App\Models\Perencanaan\Tujuan;
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
        $periodeId = $request->input('periode_penilaian_id');

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
            'opd_id' => ['required', 'uuid', 'exists:opds,id'],
            'nomor' => ['required', 'string', 'max:20'],
            'tujuan' => ['required', 'string'],
            'urutan' => ['nullable', 'integer'],
        ]);

        $tujuan->update($validated);
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
            'nomor' => ['required', 'string', 'max:20'],
            'sasaran' => ['required', 'string'],
            'urutan' => ['nullable', 'integer'],
        ]);

        $sasaran->update($validated);
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

        $validated = $request->validate([
            'nomor' => ['required', 'string', 'max:20'],
            'indikator' => ['required', 'string'],
            'jenis' => ['required', 'string', 'in:utama,pendukung'],
            'satuan' => ['nullable', 'string', 'max:50'],
            'target' => ['nullable', 'string', 'max:100'],
            'urutan' => ['nullable', 'integer'],
        ]);

        $indikator->update($validated);

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
}
