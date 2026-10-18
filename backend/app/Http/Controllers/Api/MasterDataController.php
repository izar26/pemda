<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Master\MasterJenisFraud;
use App\Models\Master\MasterKategoriRisiko;
use App\Models\Master\MasterKriteriaDampak;
use App\Models\Master\MasterPemilikRisiko;
use App\Models\Master\MasterPenyebabRisiko;
use App\Models\Master\MasterSubUnsurSpip;
use App\Models\Master\MasterSumberData;
use App\Models\Master\MasterTingkatRisiko;
use App\Models\Master\MasterUnsurSpip;
use App\Models\Opd;
use App\Services\Audit\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MasterDataController extends Controller
{
    /**
     * Whitelist configuration for all 10 Master Data entities.
     *
     * @var array<string, array{model: class-string, label: string, table: string, has_code?: bool, has_desc?: bool, with?: string[]}>
     */
    public const ENTITY_CONFIG = [
        'pemilik-risiko' => [
            'model' => MasterPemilikRisiko::class,
            'label' => 'Pemilik Risiko',
            'table' => 'master_pemilik_risikos',
        ],
        'kategori-risiko' => [
            'model' => MasterKategoriRisiko::class,
            'label' => 'Kategori Risiko',
            'table' => 'master_kategori_risikos',
            'has_code' => true,
            'desc_field' => 'definisi',
        ],
        'penyebab-risiko' => [
            'model' => MasterPenyebabRisiko::class,
            'label' => 'Penyebab Risiko',
            'table' => 'master_penyebab_risikos',
        ],
        'tingkat-risiko' => [
            'model' => MasterTingkatRisiko::class,
            'label' => 'Tingkat Risiko',
            'table' => 'master_tingkat_risikos',
            'has_code' => true,
            'desc_field' => 'deskripsi',
        ],
        'jenis-fraud' => [
            'model' => MasterJenisFraud::class,
            'label' => 'Jenis Fraud',
            'table' => 'master_jenis_frauds',
            'desc_field' => 'deskripsi',
        ],
        'kriteria-dampak' => [
            'model' => MasterKriteriaDampak::class,
            'label' => 'Kriteria Dampak',
            'table' => 'master_kriteria_dampaks',
            'desc_field' => 'deskripsi',
        ],
        'urusan-pemerintahan' => [
            'model' => \App\Models\Master\MasterUrusanPemerintahan::class,
            'label' => 'Urusan Pemerintahan',
            'table' => 'master_urusan_pemerintahans',
            'has_code' => true,
        ],
        'opd' => [
            'model' => Opd::class,
            'label' => 'Perangkat Daerah (OPD)',
            'table' => 'opds',
            'has_code' => true,
        ],
        'sumber-data' => [
            'model' => MasterSumberData::class,
            'label' => 'Sumber Data',
            'table' => 'master_sumber_datas',
            'desc_field' => 'deskripsi',
        ],
        'unsur-spip' => [
            'model' => MasterUnsurSpip::class,
            'label' => 'Unsur SPIP',
            'table' => 'master_unsur_spips',
            'with' => ['subUnsurs'],
        ],
        'sub-unsur-spip' => [
            'model' => MasterSubUnsurSpip::class,
            'label' => 'Sub-Unsur SPIP',
            'table' => 'master_sub_unsur_spips',
            'with' => ['unsur'],
        ],
    ];

    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    /**
     * Get entity configuration or abort 404.
     */
    protected function getEntityConfig(string $entity): array
    {
        if (!isset(self::ENTITY_CONFIG[$entity])) {
            abort(404, "Master data entity '{$entity}' tidak ditemukan atau tidak diizinkan.");
        }

        return self::ENTITY_CONFIG[$entity];
    }

    /**
     * List all entities.
     */
    public function index(Request $request, string $entity): JsonResponse
    {
        if (!$request->user()->can('master.view')) {
            return response()->json(['message' => 'Anda tidak memiliki izin untuk melihat master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        /** @var \Illuminate\Database\Eloquent\Builder $query */
        $query = $config['model']::query();

        if (isset($config['with'])) {
            $query->with($config['with']);
        }

        if ($request->has('search') && !empty($request->query('search'))) {
            $term = trim((string) $request->query('search'));
            $query->where(function ($q) use ($term, $config, $entity) {
                $q->where('nama', 'like', "%{$term}%");
                if (!empty($config['has_code'])) {
                    $q->orWhere('kode', 'like', "%{$term}%");
                }
                if ($entity === 'opd') {
                    $q->orWhere('kepala', 'like', "%{$term}%")
                      ->orWhere('kategori', 'like', "%{$term}%");
                }
            });
        }

        if ($request->has('is_active') && $request->query('is_active') !== 'all') {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($entity === 'opd' && $request->has('kategori') && !empty($request->query('kategori')) && $request->query('kategori') !== 'all') {
            $query->where('kategori', $request->query('kategori'));
        }

        if ($entity === 'sub-unsur-spip' && $request->has('unsur_spip_id')) {
            $query->where('unsur_spip_id', $request->query('unsur_spip_id'));
        }

        $items = $query->orderBy('urutan', 'asc')->orderBy('id', 'asc')->get();

        return response()->json([
            'entity' => [
                'key' => $entity,
                'label' => $config['label'],
            ],
            'data' => $items,
        ]);
    }

    /**
     * Export Master Data entity to Excel (.xlsx).
     */
    public function export(Request $request, string $entity, \App\Services\Export\ExcelExportService $exportService): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        if (!$request->user()->can('master.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor data master.');
        }

        $config = $this->getEntityConfig($entity);
        /** @var \Illuminate\Database\Eloquent\Builder $query */
        $query = $config['model']::query();

        if (isset($config['with'])) {
            $query->with($config['with']);
        }

        if ($request->has('search') && !empty($request->query('search'))) {
            $term = trim((string) $request->query('search'));
            $query->where(function ($q) use ($term, $config, $entity) {
                $q->where('nama', 'like', "%{$term}%");
                if (!empty($config['has_code'])) {
                    $q->orWhere('kode', 'like', "%{$term}%");
                }
                if ($entity === 'opd') {
                    $q->orWhere('kepala', 'like', "%{$term}%")
                      ->orWhere('kategori', 'like', "%{$term}%");
                }
            });
        }

        if ($request->has('is_active') && $request->query('is_active') !== 'all') {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($entity === 'sub-unsur-spip' && $request->has('unsur_spip_id')) {
            $query->where('unsur_spip_id', $request->query('unsur_spip_id'));
        }

        $query->orderBy('urutan', 'asc')->orderBy('id', 'asc');

        $headers = ['No'];
        if (!empty($config['has_code'])) {
            $headers[] = 'Kode';
        }
        if ($entity === 'unsur-spip') {
            $headers[] = 'Nomor SPIP';
        }
        $headers[] = 'Nama ' . $config['label'];

        if (!empty($config['desc_field'])) {
            $headers[] = 'Deskripsi / Detail';
        }
        if ($entity === 'sub-unsur-spip') {
            $headers[] = 'Unsur Induk SPIP';
        }
        if ($entity === 'opd') {
            $headers[] = 'Kategori';
            $headers[] = 'Kepala Instansi';
        }
        $headers[] = 'Urutan';
        $headers[] = 'Status Keaktifan';
        $headers[] = 'Tanggal Dibuat';

        $descField = $config['desc_field'] ?? null;
        $hasCode = !empty($config['has_code']);

        $generator = function () use ($query, $entity, $hasCode, $descField) {
            $no = 1;
            foreach ($query->lazy(500) as $item) {
                $row = [$no++];
                if ($hasCode) {
                    $row[] = $item->kode ?? '-';
                }
                if ($entity === 'unsur-spip') {
                    $row[] = $item->nomor ?? '-';
                }
                $row[] = $item->nama ?? '-';

                if ($descField) {
                    $row[] = $item->{$descField} ?? '-';
                }
                if ($entity === 'sub-unsur-spip') {
                    $row[] = $item->unsur?->nama ?? '-';
                }
                if ($entity === 'opd') {
                    $row[] = $item->kategori ?? '-';
                    $row[] = $item->kepala ?? '-';
                }
                $row[] = $item->urutan ?? 0;
                $row[] = $item->is_active ? 'Aktif' : 'Nonaktif';
                $row[] = $item->created_at ? $item->created_at->format('d/m/Y H:i') : '-';

                yield $row;
            }
        };

        $metadata = [
            'Jenis Data Master' => $config['label'],
        ];
        if ($request->has('search') && !empty($request->query('search'))) {
            $metadata['Kata Kunci Pencarian'] = $request->query('search');
        }

        return $exportService->streamExport(
            filename: 'Master_Data_' . Str::slug($config['label'], '_'),
            title: 'LAPORAN MASTER DATA: ' . mb_strtoupper($config['label']),
            headers: $headers,
            rows: $generator(),
            metadata: $metadata
        );
    }

    /**
     * Show single record.
     */
    public function show(Request $request, string $entity, string $id): JsonResponse
    {
        if (!$request->user()->can('master.view')) {
            return response()->json(['message' => 'Anda tidak memiliki izin untuk melihat master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        $query = $config['model']::query();

        if (isset($config['with'])) {
            $query->with($config['with']);
        }

        $item = $query->findOrFail($id);

        return response()->json(['data' => $item]);
    }

    /**
     * Reorder master data items.
     */
    public function reorder(Request $request, string $entity): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        if (!$user?->can('master.edit')) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk mengubah urutan master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);

        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'string', 'uuid', "exists:{$config['table']},id"],
        ]);

        if ($entity === 'sub-unsur-spip') {
            $distinctUnsurCount = $config['model']::whereIn('id', $validated['ids'])
                ->distinct('unsur_spip_id')
                ->count('unsur_spip_id');
            if ($distinctUnsurCount > 1) {
                return response()->json([
                    'message' => 'Semua Sub-Unsur yang diurutkan harus berada di bawah Unsur SPIP yang sama.',
                ], 422);
            }
        }

        DB::transaction(function () use ($config, $validated, $entity, $user) {
            foreach ($validated['ids'] as $index => $id) {
                $config['model']::where('id', $id)->update(['urutan' => $index + 1]);
            }

            $this->auditLogService->log(
                action: 'MASTER_DATA_REORDER',
                module: 'Master Data',
                description: "Memperbarui urutan pada {$config['label']}",
                user: $user,
                context: [
                    'action_type' => 'REORDER',
                    'entity' => $entity,
                    'entity_name' => $config['label'],
                    'count' => count($validated['ids']),
                    'ids' => $validated['ids'],
                ],
                auditableType: $config['model'],
            );
        });

        return response()->json([
            'message' => "Urutan data {$config['label']} berhasil diperbarui.",
        ]);
    }

    /**
     * Store new record.
     */
    public function store(Request $request, string $entity): JsonResponse
    {
        if (!$request->user()->can('master.create')) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk menambah master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        $rules = $this->buildValidationRules($config, $entity);
        $validated = $request->validate($rules);

        if (!isset($validated['urutan']) || $validated['urutan'] === null) {
            $maxQuery = $config['model']::query();
            if ($entity === 'sub-unsur-spip' && !empty($validated['unsur_spip_id'])) {
                $maxQuery->where('unsur_spip_id', $validated['unsur_spip_id']);
            }
            $validated['urutan'] = ((int) $maxQuery->max('urutan')) + 1;
        }

        return DB::transaction(function () use ($request, $config, $entity, $validated) {
            /** @var \Illuminate\Database\Eloquent\Model $item */
            $item = $config['model']::create($validated);

            $this->auditLogService->log(
                action: 'MASTER_DATA_CREATE',
                module: 'Master Data',
                description: "Menambahkan entri baru pada {$config['label']}: {$item->nama}",
                user: $request->user(),
                context: [
                    'action_type' => 'CREATE',
                    'entity' => $entity,
                    'entity_name' => $config['label'],
                    'record_title' => $item->nama,
                    'item_id' => $item->id,
                    'payload' => $validated,
                    'attributes' => $validated,
                ],
                auditableType: get_class($item),
                auditableId: $item->id,
            );

            if (isset($config['with'])) {
                $item->load($config['with']);
            }

            return response()->json([
                'message' => "Data {$config['label']} berhasil ditambahkan.",
                'data' => $item,
            ], 201);
        });
    }

    /**
     * Update existing record.
     */
    public function update(Request $request, string $entity, string $id): JsonResponse
    {
        if (!$request->user()->can('master.edit')) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk mengubah master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        $item = $config['model']::findOrFail($id);

        $rules = $this->buildValidationRules($config, $entity, $id);
        $validated = $request->validate($rules);

        if (array_key_exists('is_active', $validated)) {
            $newActive = (bool) $validated['is_active'];
            if ($item->is_active && !$newActive) {
                $blocker = $this->getDeactivationBlockerMessage($entity, $item);
                if ($blocker !== null) {
                    return response()->json(['message' => $blocker], 422);
                }
            } elseif (!$item->is_active && $newActive && $entity === 'sub-unsur-spip') {
                $unsurId = $validated['unsur_spip_id'] ?? $item->unsur_spip_id;
                $unsur = MasterUnsurSpip::find($unsurId);
                if ($unsur && !$unsur->is_active) {
                    return response()->json([
                        'message' => "Tidak dapat mengaktifkan Sub-Unsur SPIP '{$item->nama}' karena Unsur SPIP induknya sedang berstatus nonaktif.",
                    ], 422);
                }
            }
        }

        if (!array_key_exists('urutan', $validated) || $validated['urutan'] === null) {
            unset($validated['urutan']);
        }

        return DB::transaction(function () use ($request, $config, $entity, $item, $validated) {
            $oldData = $item->toArray();

            $changes = [];
            foreach ($validated as $key => $newVal) {
                $oldVal = $item->getOriginal($key);
                if ($oldVal != $newVal) {
                    $changes[$key] = [
                        'old' => $oldVal,
                        'new' => $newVal,
                    ];
                }
            }

            $item->update($validated);

            $this->auditLogService->log(
                action: 'MASTER_DATA_UPDATE',
                module: 'Master Data',
                description: "Memperbarui entri pada {$config['label']}: {$item->nama}",
                user: $request->user(),
                context: [
                    'action_type' => 'UPDATE',
                    'entity' => $entity,
                    'entity_name' => $config['label'],
                    'record_title' => $item->nama,
                    'item_id' => $item->id,
                    'old' => $oldData,
                    'new' => $validated,
                    'changes' => $changes,
                ],
                auditableType: get_class($item),
                auditableId: $item->id,
            );

            if (isset($config['with'])) {
                $item->load($config['with']);
            }

            return response()->json([
                'message' => "Data {$config['label']} berhasil diperbarui.",
                'data' => $item,
            ]);
        });
    }

    /**
     * Toggle active status.
     */
    public function toggleActive(Request $request, string $entity, string $id): JsonResponse
    {
        if (!$request->user()->can('master.edit')) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk mengubah status master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        $item = $config['model']::findOrFail($id);

        if ($item->is_active) {
            $blocker = $this->getDeactivationBlockerMessage($entity, $item);
            if ($blocker !== null) {
                return response()->json(['message' => $blocker], 422);
            }
        } elseif ($entity === 'sub-unsur-spip') {
            $unsur = $item->unsurSpip;
            if ($unsur && !$unsur->is_active) {
                return response()->json([
                    'message' => "Tidak dapat mengaktifkan Sub-Unsur SPIP '{$item->nama}' karena Unsur SPIP induknya ('{$unsur->nama}') sedang berstatus nonaktif.",
                ], 422);
            }
        }

        $oldStatus = $item->is_active;
        $item->is_active = !$item->is_active;
        $item->save();

        $statusStr = $item->is_active ? 'diaktifkan' : 'dinonaktifkan';

        $this->auditLogService->log(
            action: 'MASTER_DATA_TOGGLE',
            module: 'Master Data',
            description: "Status entri {$config['label']} '{$item->nama}' berhasil {$statusStr}",
            user: $request->user(),
            context: [
                'action_type' => 'UPDATE',
                'entity' => $entity,
                'entity_name' => $config['label'],
                'record_title' => $item->nama,
                'item_id' => $item->id,
                'is_active' => $item->is_active,
                'changes' => [
                    'is_active' => [
                        'old' => $oldStatus,
                        'new' => $item->is_active,
                    ],
                ],
            ],
            auditableType: get_class($item),
            auditableId: $item->id,
        );

        return response()->json([
            'message' => "Data {$config['label']} berhasil {$statusStr}.",
            'data' => $item,
        ]);
    }

    /**
     * Delete record.
     */
    public function destroy(Request $request, string $entity, string $id): JsonResponse
    {
        if (!$request->user()->can('master.delete')) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk menghapus master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        $item = $config['model']::findOrFail($id);

        $blocker = $this->getDeletionBlockerMessage($entity, $item);
        if ($blocker !== null) {
            return response()->json(['message' => $blocker], 422);
        }

        $name = $item->nama;

        return DB::transaction(function () use ($request, $config, $entity, $item, $name, $id) {
            $snapshot = $item->toArray();
            $item->delete();

            $this->auditLogService->log(
                action: 'MASTER_DATA_DELETE',
                module: 'Master Data',
                description: "Menghapus entri pada {$config['label']}: {$name}",
                user: $request->user(),
                context: [
                    'action_type' => 'DELETE',
                    'entity' => $entity,
                    'entity_name' => $config['label'],
                    'record_title' => $name,
                    'deleted_id' => $id,
                    'deleted_name' => $name,
                    'snapshot' => $snapshot,
                ],
                auditableType: get_class($item),
                auditableId: $id,
            );

            return response()->json([
                'message' => "Data {$config['label']} '{$name}' berhasil dihapus.",
            ]);
        });
    }

    /**
     * Check if a master data item cannot be deactivated because it is used in the active period or has active children.
     */
    protected function getDeactivationBlockerMessage(string $entity, object $item): ?string
    {
        if ($entity === 'sumber-data' && $item instanceof MasterSumberData) {
            $tujuanAktifCount = $item->tujuanPenilaians()->whereHas('periode', fn ($q) => $q->where('status', 'aktif'))->count();
            $konteksAktifCount = $item->konteksPenilaians()->whereHas('periode', fn ($q) => $q->where('status', 'aktif'))->count();
            $operasionalAktifCount = $item->konteksOperasionals()->whereHas('periode', fn ($q) => $q->where('status', 'aktif'))->count();

            if ($tujuanAktifCount > 0 || $konteksAktifCount > 0 || $operasionalAktifCount > 0) {
                $usages = [];
                if ($tujuanAktifCount > 0) {
                    $usages[] = "{$tujuanAktifCount} Tujuan Penilaian";
                }
                if ($konteksAktifCount > 0) {
                    $usages[] = "{$konteksAktifCount} Konteks Strategis (Form 2B)";
                }
                if ($operasionalAktifCount > 0) {
                    $usages[] = "{$operasionalAktifCount} Konteks Operasional (Form 2C)";
                }
                $usageText = implode(', ', $usages);

                return "Tidak dapat menonaktifkan Sumber Data '{$item->nama}' karena sedang digunakan pada periode penilaian aktif ({$usageText}).";
            }
        }

        if ($entity === 'opd' && $item instanceof Opd) {
            $activeUsersCount = $item->users()->where('status', 'active')->count();
            $tujuanAktifCount = $item->tujuanPenilaians()->whereHas('periode', fn ($q) => $q->where('status', 'aktif'))->count();
            $sasaranAktifCount = $item->sasaranPenilaians()->whereHas('periode', fn ($q) => $q->where('status', 'aktif'))->count();
            $indikatorAktifCount = $item->indikatorPenilaians()->whereHas('periode', fn ($q) => $q->where('status', 'aktif'))->count();
            $konteksAktifCount = $item->konteksPenilaians()->whereHas('periode', fn ($q) => $q->where('status', 'aktif'))->count();
            $operasionalAktifCount = $item->konteksOperasionals()->whereHas('periode', fn ($q) => $q->where('status', 'aktif'))->count();

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

                return "Tidak dapat menonaktifkan Perangkat Daerah (OPD) '{$item->nama}' karena masih digunakan pada periode penilaian aktif atau memiliki pegawai aktif ({$usageText}).";
            }
        }

        if ($entity === 'unsur-spip' && $item instanceof MasterUnsurSpip) {
            $activeSubCount = $item->subUnsurs()->where('is_active', true)->count();
            if ($activeSubCount > 0) {
                return "Tidak dapat menonaktifkan Unsur SPIP '{$item->nama}' karena masih memiliki {$activeSubCount} Sub-Unsur SPIP yang berstatus aktif. Nonaktifkan Sub-Unsur terkait terlebih dahulu.";
            }
        }

        return null;
    }

    /**
     * Check if a master data item cannot be deleted because it has child/dependent records.
     */
    protected function getDeletionBlockerMessage(string $entity, object $item): ?string
    {
        if ($entity === 'unsur-spip' && $item instanceof MasterUnsurSpip) {
            $subCount = $item->subUnsurs()->count();
            if ($subCount > 0) {
                return "Tidak dapat menghapus Unsur SPIP '{$item->nama}' karena masih memiliki {$subCount} Sub-Unsur terkait. Bersihkan data Sub-Unsur terlebih dahulu dari bawah.";
            }
        }

        if ($entity === 'sumber-data' && $item instanceof MasterSumberData) {
            $tujuanCount = $item->tujuanPenilaians()->count();
            $konteksCount = $item->konteksPenilaians()->count();
            $operasionalCount = $item->konteksOperasionals()->count();

            if ($tujuanCount > 0 || $konteksCount > 0 || $operasionalCount > 0) {
                $usages = [];
                if ($tujuanCount > 0) {
                    $usages[] = "{$tujuanCount} Tujuan Penilaian";
                }
                if ($konteksCount > 0) {
                    $usages[] = "{$konteksCount} Konteks Strategis (Form 2B)";
                }
                if ($operasionalCount > 0) {
                    $usages[] = "{$operasionalCount} Konteks Operasional (Form 2C)";
                }
                $usageText = implode(', ', $usages);

                return "Tidak dapat menghapus Sumber Data '{$item->nama}' karena sudah digunakan pada {$usageText}. Bersihkan data turunannya terlebih dahulu dari bawah.";
            }
        }

        if ($entity === 'opd' && $item instanceof Opd) {
            $userCount = $item->users()->count();
            $tujuanCount = $item->tujuanPenilaians()->count();
            $sasaranCount = $item->sasaranPenilaians()->count();
            $indikatorCount = $item->indikatorPenilaians()->count();
            $konteksCount = $item->konteksPenilaians()->count();
            $operasionalCount = $item->konteksOperasionals()->count();

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

                return "Tidak dapat menghapus Perangkat Daerah (OPD) '{$item->nama}' karena masih memiliki data terkait ({$usageText}). Bersihkan data turunannya terlebih dahulu dari bawah.";
            }
        }

        return null;
    }

    /**
     * Build dynamic validation rules based on entity config.
     */
    protected function buildValidationRules(array $config, string $entity, ?string $ignoreId = null): array
    {
        $rules = [
            'nama' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'urutan' => ['nullable', 'integer', 'min:0'],
        ];

        if (!empty($config['has_code'])) {
            $codeRule = ['required', 'string', 'max:50'];
            if ($entity === 'kategori-risiko' || $entity === 'tingkat-risiko' || $entity === 'opd') {
                $codeRule[] = Rule::unique($config['table'], 'kode')->ignore($ignoreId);
            }
            $rules['kode'] = $codeRule;
        }

        if (!empty($config['desc_field'])) {
            $rules[$config['desc_field']] = ['nullable', 'string'];
        }

        if ($entity === 'opd') {
            $rules['kategori'] = ['nullable', 'string', 'max:50'];
            $rules['kepala'] = ['nullable', 'string', 'max:150'];
        }

        if ($entity === 'unsur-spip') {
            $rules['nomor'] = ['required', 'string', 'max:10'];
        }

        if ($entity === 'sub-unsur-spip') {
            $rules['unsur_spip_id'] = [
                'required',
                'string',
                'uuid',
                Rule::exists('master_unsur_spips', 'id')->where('is_active', true),
            ];
        }

        return $rules;
    }
}

