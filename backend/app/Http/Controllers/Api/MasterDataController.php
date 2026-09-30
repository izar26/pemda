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
                $q->where('nama', 'ilike', "%{$term}%");
                if (!empty($config['has_code'])) {
                    $q->orWhere('kode', 'ilike', "%{$term}%");
                }
                if ($entity === 'opd') {
                    $q->orWhere('kepala', 'ilike', "%{$term}%")
                      ->orWhere('kategori', 'ilike', "%{$term}%");
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
     * Show single record.
     */
    public function show(Request $request, string $entity, int $id): JsonResponse
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
    public function update(Request $request, string $entity, int $id): JsonResponse
    {
        if (!$request->user()->can('master.edit')) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk mengubah master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        $item = $config['model']::findOrFail($id);

        $rules = $this->buildValidationRules($config, $entity, $id);
        $validated = $request->validate($rules);

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
    public function toggleActive(Request $request, string $entity, int $id): JsonResponse
    {
        if (!$request->user()->can('master.edit')) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk mengubah status master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        $item = $config['model']::findOrFail($id);

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
    public function destroy(Request $request, string $entity, int $id): JsonResponse
    {
        if (!$request->user()->can('master.delete')) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk menghapus master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        $item = $config['model']::findOrFail($id);

        // Relational safety check: Do not allow deleting an Unsur SPIP if it has child Sub-Unsurs
        if ($entity === 'unsur-spip' && method_exists($item, 'subUnsurs') && $item->subUnsurs()->count() > 0) {
            return response()->json([
                'message' => "Tidak dapat menghapus Unsur SPIP ini karena masih memiliki {$item->subUnsurs()->count()} Sub-Unsur terkait. Hapus atau pindahkan Sub-Unsur terlebih dahulu.",
            ], 422);
        }

        // Relational safety check: Do not allow deleting an OPD if it has assigned users
        if ($entity === 'opd' && method_exists($item, 'users') && $item->users()->count() > 0) {
            return response()->json([
                'message' => "Tidak dapat menghapus Perangkat Daerah (OPD) ini karena masih memiliki {$item->users()->count()} pegawai yang terdaftar. Pindahkan pegawai terlebih dahulu atau nonaktifkan status OPD.",
            ], 422);
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
     * Build dynamic validation rules based on entity config.
     */
    protected function buildValidationRules(array $config, string $entity, ?int $ignoreId = null): array
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
            $rules['unsur_spip_id'] = ['required', 'integer', 'exists:master_unsur_spips,id'];
        }

        return $rules;
    }
}
