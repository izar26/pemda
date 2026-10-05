<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OpdResource;
use App\Models\Opd;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class OpdController extends Controller
{
    /**
     * Get list of OPDs.
     * Supports public/dropdown view (all active) or paginated management view with RBAC.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $isAll = $request->boolean('all') || $request->input('paginate') === 'false';
        $isPublic = is_null($user);

        // Fast public dropdown for registration, invitations, etc.
        if ($isAll || ($isPublic && !$request->has('per_page') && !$request->has('page'))) {
            $query = Opd::query()->where('is_active', true);

            if ($request->has('kategori') && $request->input('kategori') !== 'all') {
                $query->where('kategori', $request->query('kategori'));
            }

            if ($request->has('search')) {
                $term = trim((string) $request->query('search'));
                if ($term !== '') {
                    $query->where(function ($q) use ($term) {
                        $q->where('nama', 'like', "%{$term}%")
                            ->orWhere('kode', 'like', "%{$term}%");
                    });
                }
            }

            $opds = $query->orderBy('urutan', 'asc')->orderBy('nama', 'asc')->get();

            return response()->json([
                'data' => OpdResource::collection($opds),
            ]);
        }

        // Authenticated management table - verify permission
        if (!$user?->can('opd.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data perangkat daerah.');
        }

        $query = Opd::query()->withCount('users');

        // Filter: Category
        if ($request->filled('kategori') && $request->input('kategori') !== 'all') {
            $query->where('kategori', $request->input('kategori'));
        }

        // Filter: Status (all, active, inactive)
        if ($request->filled('status') && $request->input('status') !== 'all') {
            if ($request->input('status') === 'active') {
                $query->where('is_active', true);
            } elseif ($request->input('status') === 'inactive') {
                $query->where('is_active', false);
            }
        }

        // Search: nama, kode, kepala
        if ($request->filled('search')) {
            $term = trim((string) $request->input('search'));
            if ($term !== '') {
                $query->where(function ($q) use ($term) {
                    $q->where('nama', 'like', "%{$term}%")
                        ->orWhere('kode', 'like', "%{$term}%")
                        ->orWhere('kepala', 'like', "%{$term}%");
                });
            }
        }

        // Sorting
        $allowedSorts = ['id', 'urutan', 'nama', 'kode', 'kategori', 'kepala', 'is_active', 'created_at', 'users_count'];
        $sortBy = (string) $request->input('sort_by', 'urutan');
        if (!in_array($sortBy, $allowedSorts, true)) {
            $sortBy = 'urutan';
        }

        $sortDirection = strtolower((string) $request->input('sort_direction', 'asc')) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sortBy, $sortDirection);

        // Pagination
        $perPage = (int) $request->input('per_page', 10);
        if ($perPage < 1 || $perPage > 100) {
            $perPage = 10;
        }

        $paginated = $query->paginate($perPage);

        return response()->json([
            'data' => OpdResource::collection($paginated->items()),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Get summary statistics for OPD.
     */
    public function stats(Request $request): JsonResponse
    {
        if (!$request->user()?->can('opd.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat data perangkat daerah.');
        }

        $total = Opd::count();
        $active = Opd::where('is_active', true)->count();
        $inactive = Opd::where('is_active', false)->count();

        $byKategori = Opd::query()
            ->selectRaw('kategori, count(*) as count')
            ->groupBy('kategori')
            ->pluck('count', 'kategori');

        $totalPegawai = User::whereNotNull('opd_id')->count();

        return response()->json([
            'total' => $total,
            'active' => $active,
            'inactive' => $inactive,
            'by_kategori' => $byKategori,
            'total_pegawai' => $totalPegawai,
        ]);
    }

    /**
     * Get a single OPD.
     */
    public function show(Opd $opd): JsonResponse
    {
        $opd->loadCount('users');

        return response()->json([
            'data' => new OpdResource($opd),
        ]);
    }

    /**
     * Store a new OPD.
     */
    public function store(Request $request): JsonResponse
    {
        if (!$request->user()?->can('opd.create')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menambahkan perangkat daerah.');
        }

        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
            'kode' => ['required', 'string', 'max:50', 'unique:opds,kode'],
            'kategori' => ['required', 'string', 'in:Dinas,Badan,Sekretariat,Inspektorat,RSUD,Kecamatan,Kantor,Lainnya'],
            'kepala' => ['nullable', 'string', 'max:255'],
            'urutan' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (!isset($validated['urutan']) || $validated['urutan'] === null) {
            $validated['urutan'] = ((int) Opd::max('urutan')) + 1;
        }

        $validated['is_active'] = $validated['is_active'] ?? true;

        $opd = Opd::create($validated);
        $opd->loadCount('users');

        return response()->json([
            'message' => 'Perangkat daerah berhasil ditambahkan.',
            'data' => new OpdResource($opd),
        ], 201);
    }

    /**
     * Update an existing OPD.
     */
    public function update(Request $request, Opd $opd): JsonResponse
    {
        if (!$request->user()?->can('opd.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah data perangkat daerah.');
        }

        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255'],
            'kode' => ['required', 'string', 'max:50', Rule::unique('opds', 'kode')->ignore($opd->id)],
            'kategori' => ['required', 'string', 'in:Dinas,Badan,Sekretariat,Inspektorat,RSUD,Kecamatan,Kantor,Lainnya'],
            'kepala' => ['nullable', 'string', 'max:255'],
            'urutan' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        $opd->update($validated);
        $opd->loadCount('users');

        return response()->json([
            'message' => 'Perangkat daerah berhasil diperbarui.',
            'data' => new OpdResource($opd),
        ]);
    }

    /**
     * Toggle active status of an OPD.
     */
    public function toggleActive(Request $request, Opd $opd): JsonResponse
    {
        if (!$request->user()?->can('opd.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah status perangkat daerah.');
        }

        $opd->update(['is_active' => !$opd->is_active]);
        $opd->loadCount('users');

        return response()->json([
            'message' => 'Status keaktifan perangkat daerah berhasil diubah.',
            'data' => new OpdResource($opd),
        ]);
    }

    /**
     * Delete an OPD.
     */
    public function destroy(Request $request, Opd $opd): JsonResponse
    {
        if (!$request->user()?->can('opd.delete')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus perangkat daerah.');
        }

        if ($opd->users()->count() > 0) {
            return response()->json([
                'message' => 'Tidak dapat menghapus OPD ini karena masih terdapat pegawai yang ditugaskan di instansi ini.',
            ], 422);
        }

        $opd->delete();

        return response()->json([
            'message' => 'Perangkat daerah berhasil dihapus.',
        ]);
    }
}
