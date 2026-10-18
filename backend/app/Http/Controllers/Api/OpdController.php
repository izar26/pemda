<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OpdResource;
use App\Models\Opd;
use App\Models\User;
use App\Services\Export\ExcelExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OpdController extends Controller
{
    /**
     * Export OPD data to Excel (.xlsx).
     */
    public function export(Request $request, ExcelExportService $exportService): StreamedResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('opd.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor data perangkat daerah.');
        }

        $query = Opd::query()->withCount('users');

        if ($request->filled('kategori') && $request->input('kategori') !== 'all') {
            $query->where('kategori', $request->input('kategori'));
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            if ($request->input('status') === 'active') {
                $query->where('is_active', true);
            } elseif ($request->input('status') === 'inactive') {
                $query->where('is_active', false);
            }
        }

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

        $query->orderBy('urutan', 'asc')->orderBy('nama', 'asc');

        $headers = [
            'No',
            'Kode Instansi',
            'Nama Perangkat Daerah (OPD)',
            'Kategori / Jenis',
            'Kepala / Pimpinan OPD',
            'Jumlah Pegawai ASN',
            'Urutan Display',
            'Status Keaktifan',
            'Tanggal Dibuat',
        ];

        $generator = function () use ($query) {
            $no = 1;
            foreach ($query->lazy(500) as $opd) {
                yield [
                    $no++,
                    $opd->kode,
                    $opd->nama,
                    $opd->kategori,
                    $opd->kepala ?? '-',
                    $opd->users_count ?? 0,
                    $opd->urutan,
                    $opd->is_active ? 'Aktif' : 'Nonaktif',
                    $opd->created_at ? $opd->created_at->format('d/m/Y H:i') : '-',
                ];
            }
        };

        $metadata = [];
        if ($request->filled('search')) {
            $metadata['Kata Kunci Pencarian'] = $request->input('search');
        }
        if ($request->filled('kategori') && $request->input('kategori') !== 'all') {
            $metadata['Kategori OPD'] = $request->input('kategori');
        }

        return $exportService->streamExport(
            filename: 'Data_Perangkat_Daerah_OPD',
            title: 'LAPORAN REKAPITULASI PERANGKAT DAERAH (OPD)',
            headers: $headers,
            rows: $generator(),
            metadata: $metadata
        );
    }
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
            'kategori' => ['required', 'string', 'in:Dinas,Badan,Sekretariat,Inspektorat,RSUD,Kecamatan,BUMD,DESA/KELURAHAN,Desa/Kelurahan'],
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
     * Reorder OPD display sequence.
     */
    public function reorder(Request $request, \App\Services\Audit\AuditLogService $auditLogService): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('opd.edit')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah urutan perangkat daerah.');
        }

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:opds,id'],
        ]);

        \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $user, $auditLogService) {
            foreach ($validated['ids'] as $index => $id) {
                Opd::where('id', $id)->update(['urutan' => $index + 1]);
            }

            $auditLogService->log(
                action: 'OPD_REORDER',
                module: 'Perangkat Daerah',
                description: 'Memperbarui urutan tampilan perangkat daerah',
                user: $user,
                context: [
                    'action_type' => 'REORDER',
                    'count' => count($validated['ids']),
                    'ids' => $validated['ids'],
                ],
                auditableType: Opd::class,
            );
        });

        return response()->json([
            'message' => 'Urutan perangkat daerah berhasil diperbarui.',
        ]);
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
            'kategori' => ['required', 'string', 'in:Dinas,Badan,Sekretariat,Inspektorat,RSUD,Kecamatan,BUMD,DESA/KELURAHAN,Desa/Kelurahan'],
            'kepala' => ['nullable', 'string', 'max:255'],
            'urutan' => ['nullable', 'integer', 'min:0'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        if (array_key_exists('is_active', $validated) && $opd->is_active && !$validated['is_active']) {
            $blocker = $this->getDeactivationBlockerMessage($opd);
            if ($blocker !== null) {
                return response()->json(['message' => $blocker], 422);
            }
        }

        if (!array_key_exists('urutan', $validated) || $validated['urutan'] === null) {
            unset($validated['urutan']);
        }

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

        if ($opd->is_active) {
            $blocker = $this->getDeactivationBlockerMessage($opd);
            if ($blocker !== null) {
                return response()->json(['message' => $blocker], 422);
            }
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

        $blocker = $this->getDeletionBlockerMessage($opd);
        if ($blocker !== null) {
            return response()->json([
                'message' => $blocker,
            ], 422);
        }

        $opd->delete();

        return response()->json([
            'message' => 'Perangkat daerah berhasil dihapus.',
        ]);
    }

    /**
     * Check if an OPD cannot be deactivated because it is used in the active period or has active employees.
     */
    protected function getDeactivationBlockerMessage(Opd $opd): ?string
    {
        $activeUsersCount = $opd->users()->where('status', 'active')->count();
        $tujuanAktifCount = $opd->tujuanPenilaians()->whereHas('periode', fn ($q) => $q->where('status', 'aktif'))->count();
        $sasaranAktifCount = $opd->sasaranPenilaians()->whereHas('periode', fn ($q) => $q->where('status', 'aktif'))->count();
        $indikatorAktifCount = $opd->indikatorPenilaians()->whereHas('periode', fn ($q) => $q->where('status', 'aktif'))->count();
        $konteksAktifCount = $opd->konteksPenilaians()->whereHas('periode', fn ($q) => $q->where('status', 'aktif'))->count();
        $operasionalAktifCount = $opd->konteksOperasionals()->whereHas('periode', fn ($q) => $q->where('status', 'aktif'))->count();

        if (
            $activeUsersCount > 0 ||
            $tujuanAktifCount > 0 ||
            $sasaranAktifCount > 0 ||
            $indikatorAktifCount > 0 ||
            $konteksAktifCount > 0 ||
            $operasionalAktifCount > 0
        ) {
            $usages = [];
            if ($activeUsersCount > 0) {
                $usages[] = "{$activeUsersCount} Pegawai/Akun Aktif";
            }
            if ($tujuanAktifCount > 0) {
                $usages[] = "{$tujuanAktifCount} Tujuan";
            }
            if ($sasaranAktifCount > 0) {
                $usages[] = "{$sasaranAktifCount} Sasaran";
            }
            if ($indikatorAktifCount > 0) {
                $usages[] = "{$indikatorAktifCount} Indikator";
            }
            if ($konteksAktifCount > 0) {
                $usages[] = "{$konteksAktifCount} Konteks Strategis";
            }
            if ($operasionalAktifCount > 0) {
                $usages[] = "{$operasionalAktifCount} Konteks Operasional";
            }
            $usageText = implode(', ', $usages);

            return "Tidak dapat menonaktifkan Perangkat Daerah (OPD) '{$opd->nama}' karena sedang digunakan pada periode penilaian aktif atau masih memiliki pegawai aktif ({$usageText}).";
        }

        return null;
    }

    /**
     * Check if an OPD cannot be deleted because it has child/dependent records.
     */
    protected function getDeletionBlockerMessage(Opd $opd): ?string
    {
        $userCount = $opd->users()->count();
        $tujuanCount = $opd->tujuanPenilaians()->count();
        $sasaranCount = $opd->sasaranPenilaians()->count();
        $indikatorCount = $opd->indikatorPenilaians()->count();
        $konteksCount = $opd->konteksPenilaians()->count();
        $operasionalCount = $opd->konteksOperasionals()->count();

        if (
            $userCount > 0 ||
            $tujuanCount > 0 ||
            $sasaranCount > 0 ||
            $indikatorCount > 0 ||
            $konteksCount > 0 ||
            $operasionalCount > 0
        ) {
            $usages = [];
            if ($userCount > 0) {
                $usages[] = "{$userCount} Pegawai";
            }
            if ($tujuanCount > 0) {
                $usages[] = "{$tujuanCount} Tujuan";
            }
            if ($sasaranCount > 0) {
                $usages[] = "{$sasaranCount} Sasaran";
            }
            if ($indikatorCount > 0) {
                $usages[] = "{$indikatorCount} Indikator";
            }
            if ($konteksCount > 0) {
                $usages[] = "{$konteksCount} Konteks Strategis";
            }
            if ($operasionalCount > 0) {
                $usages[] = "{$operasionalCount} Konteks Operasional";
            }
            $usageText = implode(', ', $usages);

            return "Tidak dapat menghapus Perangkat Daerah (OPD) '{$opd->nama}' karena masih memiliki data terkait ({$usageText}). Bersihkan data turunannya terlebih dahulu dari bawah.";
        }

        return null;
    }
}

