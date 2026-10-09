<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Perencanaan;

use App\Http\Controllers\Controller;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\RenstraKegiatan;
use App\Models\Perencanaan\RenstraProgram;
use App\Models\Perencanaan\RenstraSubKegiatan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RenstraController extends Controller
{
    /**
     * Get nested hierarchy tree for Renstra SKPD (Program -> Kegiatan -> Sub Kegiatan).
     */
    public function tree(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('perencanaan.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data Renstra SKPD.');
        }

        $periodeId = $request->input('periode_penilaian_id');
        if (!$periodeId) {
            $activePeriode = PeriodePenilaian::where('status', 'active')->first();
            $periodeId = $activePeriode?->id;
        }

        // OPD Scope Filtering Safeguard
        $opdId = $request->input('opd_id');
        if (!$user->hasRole('Superadmin') && $user->opd_id) {
            $opdId = $user->opd_id;
        }

        $query = RenstraProgram::with(['opd', 'kegiatans.subKegiatans']);

        if ($periodeId) {
            $query->where('periode_penilaian_id', $periodeId);
        }

        if ($opdId && $opdId !== 'all') {
            $query->where('opd_id', $opdId);
        }

        if ($request->filled('search')) {
            $term = trim((string) $request->input('search'));
            $query->where(function ($q) use ($term) {
                $q->where('nama', 'like', "%{$term}%")
                  ->orWhere('kode', 'like', "%{$term}%")
                  ->orWhereHas('kegiatans', function ($kq) use ($term) {
                      $kq->where('nama', 'like', "%{$term}%")
                        ->orWhere('kode', 'like', "%{$term}%")
                        ->orWhereHas('subKegiatans', function ($sq) use ($term) {
                            $sq->where('nama', 'like', "%{$term}%")
                              ->orWhere('kode', 'like', "%{$term}%");
                        });
                  });
            });
        }

        $programs = $query->orderBy('kode', 'asc')->orderBy('urutan', 'asc')->get();

        return response()->json([
            'data' => $programs,
        ]);
    }

    // --- 1. PROGRAM CRUD ---
    public function storeProgram(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('perencanaan.renstra')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menginput Program Renstra.');
        }

        $opdId = $request->input('opd_id');
        if (!$user->hasRole('Superadmin') && $user->opd_id) {
            $opdId = $user->opd_id;
        }

        $validated = $request->validate([
            'periode_penilaian_id' => ['required', 'uuid', 'exists:periode_penilaians,id'],
            'opd_id' => ['required', 'uuid', 'exists:opds,id'],
            'kode' => ['required', 'string', 'max:50'],
            'nama' => ['required', 'string', 'max:255'],
            'indikator' => ['nullable', 'string'],
            'target' => ['nullable', 'string', 'max:100'],
            'satuan' => ['nullable', 'string', 'max:50'],
            'urutan' => ['nullable', 'integer'],
        ]);

        if ($opdId) {
            $validated['opd_id'] = $opdId;
        }

        $validated['urutan'] = $validated['urutan'] ?? ((int) RenstraProgram::where('opd_id', $validated['opd_id'])->max('urutan')) + 1;

        $program = RenstraProgram::create($validated);
        $program->load(['opd', 'kegiatans.subKegiatans']);

        return response()->json([
            'message' => 'Program Renstra berhasil ditambahkan.',
            'data' => $program,
        ], 201);
    }

    public function updateProgram(Request $request, RenstraProgram $program): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('perencanaan.renstra')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah Program Renstra.');
        }

        if (!$user->hasRole('Superadmin') && $user->opd_id && $program->opd_id !== $user->opd_id) {
            abort(403, 'Anda hanya dapat mengelola data Program milik OPD Anda sendiri.');
        }

        $validated = $request->validate([
            'kode' => ['required', 'string', 'max:50'],
            'nama' => ['required', 'string', 'max:255'],
            'indikator' => ['nullable', 'string'],
            'target' => ['nullable', 'string', 'max:100'],
            'satuan' => ['nullable', 'string', 'max:50'],
            'urutan' => ['nullable', 'integer'],
        ]);

        $program->update($validated);
        $program->load(['opd', 'kegiatans.subKegiatans']);

        return response()->json([
            'message' => 'Program Renstra berhasil diperbarui.',
            'data' => $program,
        ]);
    }

    public function destroyProgram(Request $request, RenstraProgram $program): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('perencanaan.renstra')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus Program Renstra.');
        }

        if (!$user->hasRole('Superadmin') && $user->opd_id && $program->opd_id !== $user->opd_id) {
            abort(403, 'Anda hanya dapat mengelola data Program milik OPD Anda sendiri.');
        }

        $program->delete();

        return response()->json([
            'message' => 'Program Renstra beserta kegiatan dan sub-kegiatan terkait berhasil dihapus.',
        ]);
    }

    // --- 2. KEGIATAN CRUD ---
    public function storeKegiatan(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('perencanaan.renstra')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menginput Kegiatan Renstra.');
        }

        $opdId = $request->input('opd_id');
        if (!$user->hasRole('Superadmin') && $user->opd_id) {
            $opdId = $user->opd_id;
        }

        $validated = $request->validate([
            'renstra_program_id' => ['required', 'uuid', 'exists:renstra_programs,id'],
            'periode_penilaian_id' => ['required', 'uuid', 'exists:periode_penilaians,id'],
            'opd_id' => ['required', 'uuid', 'exists:opds,id'],
            'kode' => ['required', 'string', 'max:50'],
            'nama' => ['required', 'string', 'max:255'],
            'indikator' => ['nullable', 'string'],
            'target' => ['nullable', 'string', 'max:100'],
            'satuan' => ['nullable', 'string', 'max:50'],
            'urutan' => ['nullable', 'integer'],
        ]);

        if ($opdId) {
            $validated['opd_id'] = $opdId;
        }

        $validated['urutan'] = $validated['urutan'] ?? ((int) RenstraKegiatan::where('renstra_program_id', $validated['renstra_program_id'])->max('urutan')) + 1;

        $kegiatan = RenstraKegiatan::create($validated);
        $kegiatan->load('subKegiatans');

        return response()->json([
            'message' => 'Kegiatan Renstra berhasil ditambahkan.',
            'data' => $kegiatan,
        ], 201);
    }

    public function updateKegiatan(Request $request, RenstraKegiatan $kegiatan): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('perencanaan.renstra')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah Kegiatan Renstra.');
        }

        if (!$user->hasRole('Superadmin') && $user->opd_id && $kegiatan->opd_id !== $user->opd_id) {
            abort(403, 'Anda hanya dapat mengelola data Kegiatan milik OPD Anda sendiri.');
        }

        $validated = $request->validate([
            'kode' => ['required', 'string', 'max:50'],
            'nama' => ['required', 'string', 'max:255'],
            'indikator' => ['nullable', 'string'],
            'target' => ['nullable', 'string', 'max:100'],
            'satuan' => ['nullable', 'string', 'max:50'],
            'urutan' => ['nullable', 'integer'],
        ]);

        $kegiatan->update($validated);
        $kegiatan->load('subKegiatans');

        return response()->json([
            'message' => 'Kegiatan Renstra berhasil diperbarui.',
            'data' => $kegiatan,
        ]);
    }

    public function destroyKegiatan(Request $request, RenstraKegiatan $kegiatan): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('perencanaan.renstra')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus Kegiatan Renstra.');
        }

        if (!$user->hasRole('Superadmin') && $user->opd_id && $kegiatan->opd_id !== $user->opd_id) {
            abort(403, 'Anda hanya dapat mengelola data Kegiatan milik OPD Anda sendiri.');
        }

        $kegiatan->delete();

        return response()->json([
            'message' => 'Kegiatan Renstra beserta sub-kegiatan terkait berhasil dihapus.',
        ]);
    }

    // --- 3. SUB KEGIATAN CRUD ---
    public function storeSubKegiatan(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('perencanaan.renstra')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menginput Sub-Kegiatan Renstra.');
        }

        $opdId = $request->input('opd_id');
        if (!$user->hasRole('Superadmin') && $user->opd_id) {
            $opdId = $user->opd_id;
        }

        $validated = $request->validate([
            'renstra_kegiatan_id' => ['required', 'uuid', 'exists:renstra_kegiatans,id'],
            'periode_penilaian_id' => ['required', 'uuid', 'exists:periode_penilaians,id'],
            'opd_id' => ['required', 'uuid', 'exists:opds,id'],
            'kode' => ['required', 'string', 'max:50'],
            'nama' => ['required', 'string', 'max:255'],
            'indikator' => ['nullable', 'string'],
            'target' => ['nullable', 'string', 'max:100'],
            'satuan' => ['nullable', 'string', 'max:50'],
            'sipd_id' => ['nullable', 'string', 'max:100'],
            'urutan' => ['nullable', 'integer'],
        ]);

        if ($opdId) {
            $validated['opd_id'] = $opdId;
        }

        $validated['urutan'] = $validated['urutan'] ?? ((int) RenstraSubKegiatan::where('renstra_kegiatan_id', $validated['renstra_kegiatan_id'])->max('urutan')) + 1;

        $subKegiatan = RenstraSubKegiatan::create($validated);

        return response()->json([
            'message' => 'Sub-Kegiatan Renstra berhasil ditambahkan.',
            'data' => $subKegiatan,
        ], 201);
    }

    public function updateSubKegiatan(Request $request, RenstraSubKegiatan $subKegiatan): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('perencanaan.renstra')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah Sub-Kegiatan Renstra.');
        }

        if (!$user->hasRole('Superadmin') && $user->opd_id && $subKegiatan->opd_id !== $user->opd_id) {
            abort(403, 'Anda hanya dapat mengelola data Sub-Kegiatan milik OPD Anda sendiri.');
        }

        $validated = $request->validate([
            'kode' => ['required', 'string', 'max:50'],
            'nama' => ['required', 'string', 'max:255'],
            'indikator' => ['nullable', 'string'],
            'target' => ['nullable', 'string', 'max:100'],
            'satuan' => ['nullable', 'string', 'max:50'],
            'sipd_id' => ['nullable', 'string', 'max:100'],
            'urutan' => ['nullable', 'integer'],
        ]);

        $subKegiatan->update($validated);

        return response()->json([
            'message' => 'Sub-Kegiatan Renstra berhasil diperbarui.',
            'data' => $subKegiatan,
        ]);
    }

    public function destroySubKegiatan(Request $request, RenstraSubKegiatan $subKegiatan): JsonResponse
    {
        $user = $request->user();
        if (!$user->can('perencanaan.renstra')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus Sub-Kegiatan Renstra.');
        }

        if (!$user->hasRole('Superadmin') && $user->opd_id && $subKegiatan->opd_id !== $user->opd_id) {
            abort(403, 'Anda hanya dapat mengelola data Sub-Kegiatan milik OPD Anda sendiri.');
        }

        $subKegiatan->delete();

        return response()->json([
            'message' => 'Sub-Kegiatan Renstra berhasil dihapus.',
        ]);
    }
}
