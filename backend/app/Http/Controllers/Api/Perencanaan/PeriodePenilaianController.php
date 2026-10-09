<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Perencanaan;

use App\Http\Controllers\Controller;
use App\Models\Perencanaan\PeriodePenilaian;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PeriodePenilaianController extends Controller
{
    /**
     * List all Periode Penilaian (Fitur 13).
     */
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->can('perencanaan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat periode penilaian.');
        }

        $periodes = PeriodePenilaian::query()
            ->orderBy('tahun', 'desc')
            ->orderBy('status', 'asc')
            ->get();

        return response()->json([
            'data' => $periodes,
        ]);
    }

    /**
     * Get currently active Periode Penilaian.
     */
    public function active(Request $request): JsonResponse
    {
        $active = PeriodePenilaian::where('status', 'active')->first();

        if (!$active) {
            $active = PeriodePenilaian::orderBy('tahun', 'desc')->first();
        }

        return response()->json([
            'data' => $active,
        ]);
    }

    /**
     * Normalize payload for PeriodePenilaian.
     */
    protected function normalizePeriodePayload(Request $request): array
    {
        $data = $request->all();

        // Support aliases
        if (isset($data['periode_penilaian']) && !isset($data['periode'])) {
            $data['periode'] = $data['periode_penilaian'];
        }
        if (isset($data['tahun_penilaian']) && !isset($data['tahun'])) {
            $data['tahun'] = (int) $data['tahun_penilaian'];
        }
        if (isset($data['keterangan']) && !isset($data['catatan'])) {
            $data['catatan'] = $data['keterangan'];
        }
        if (isset($data['status'])) {
            $data['status'] = match ($data['status']) {
                'Aktif', 'active' => 'active',
                'Tidak Aktif', 'inactive' => 'inactive',
                'Arsip', 'archived' => 'archived',
                default => 'inactive',
            };
        }

        return $data;
    }

    /**
     * Store a new Periode Penilaian (Bapperida).
     */
    public function store(Request $request): JsonResponse
    {
        if (!$request->user()->can('perencanaan.periode')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak menambahkan periode penilaian.');
        }

        $request->merge($this->normalizePeriodePayload($request));

        $validated = $request->validate([
            'periode' => ['required', 'string', 'max:50'],
            'tahun' => ['required', 'integer', 'min:2020', 'max:2050'],
            'tanggal_mulai' => ['required', 'date'],
            'tanggal_berakhir' => ['required', 'date', 'after_or_equal:tanggal_mulai'],
            'status' => ['required', 'string', 'in:active,inactive,archived'],
            'catatan' => ['nullable', 'string'],
        ]);

        return DB::transaction(function () use ($validated) {
            if ($validated['status'] === 'active') {
                PeriodePenilaian::where('status', 'active')->update(['status' => 'inactive']);
            }

            $periode = PeriodePenilaian::create($validated);

            return response()->json([
                'message' => 'Periode penilaian berhasil ditambahkan.',
                'data' => $periode,
            ], 201);
        });
    }

    /**
     * Update an existing Periode Penilaian.
     */
    public function update(Request $request, PeriodePenilaian $periode): JsonResponse
    {
        if (!$request->user()->can('perencanaan.periode')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak mengubah periode penilaian.');
        }

        $request->merge($this->normalizePeriodePayload($request));

        $validated = $request->validate([
            'periode' => ['required', 'string', 'max:50'],
            'tahun' => ['required', 'integer', 'min:2020', 'max:2050'],
            'tanggal_mulai' => ['required', 'date'],
            'tanggal_berakhir' => ['required', 'date', 'after_or_equal:tanggal_mulai'],
            'status' => ['required', 'string', 'in:active,inactive,archived'],
            'catatan' => ['nullable', 'string'],
        ]);

        return DB::transaction(function () use ($periode, $validated) {
            if ($validated['status'] === 'active' && $periode->status !== 'active') {
                PeriodePenilaian::where('status', 'active')->update(['status' => 'inactive']);
            }

            $periode->update($validated);

            return response()->json([
                'message' => 'Periode penilaian berhasil diperbarui.',
                'data' => $periode,
            ]);
        });
    }

    /**
     * Update status of a Periode Penilaian.
     */
    public function updateStatus(Request $request, PeriodePenilaian $periode): JsonResponse
    {
        if (!$request->user()->can('perencanaan.periode')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak mengubah status periode penilaian.');
        }

        $statusInput = $request->input('status', 'active');
        $statusDb = match ($statusInput) {
            'Aktif', 'active' => 'active',
            'Tidak Aktif', 'inactive' => 'inactive',
            'Arsip', 'archived' => 'archived',
            default => 'inactive',
        };

        DB::transaction(function () use ($periode, $statusDb) {
            if ($statusDb === 'active') {
                PeriodePenilaian::where('status', 'active')->update(['status' => 'inactive']);
            }
            $periode->update(['status' => $statusDb]);
        });

        return response()->json([
            'message' => "Status periode berhasil diubah menjadi {$statusInput}.",
            'data' => $periode->fresh(),
        ]);
    }

    /**
     * Set a specific Periode Penilaian as active.
     */
    public function activate(Request $request, PeriodePenilaian $periode): JsonResponse
    {
        if (!$request->user()->can('perencanaan.periode')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak mengaktifkan periode penilaian.');
        }

        DB::transaction(function () use ($periode) {
            PeriodePenilaian::where('status', 'active')->update(['status' => 'inactive']);
            $periode->update(['status' => 'active']);
        });

        return response()->json([
            'message' => "Periode penilaian Tahun {$periode->tahun} ({$periode->periode}) berhasil diaktifkan.",
            'data' => $periode->fresh(),
        ]);
    }

    /**
     * Delete a Periode Penilaian.
     */
    public function destroy(Request $request, PeriodePenilaian $periode): JsonResponse
    {
        if (!$request->user()->can('perencanaan.periode')) {
            abort(403, 'Hanya Bapperida / Admin yang berhak menghapus periode penilaian.');
        }

        if ($periode->tujuans()->count() > 0 || $periode->renstraPrograms()->count() > 0) {
            return response()->json([
                'message' => 'Tidak dapat menghapus periode ini karena sudah memiliki data cascading atau Renstra SKPD.',
            ], 422);
        }

        $periode->delete();

        return response()->json([
            'message' => 'Periode penilaian berhasil dihapus.',
        ]);
    }
}
