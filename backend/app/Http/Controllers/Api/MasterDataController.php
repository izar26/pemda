<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MasterData\ReorderMasterDataRequest;
use App\Models\Master\MasterJenisFraud;
use App\Models\Master\MasterKategoriRisiko;
use App\Models\Master\MasterKriteriaDampak;
use App\Models\Master\MasterPemilikRisiko;
use App\Models\Master\MasterPenyebabRisiko;
use App\Models\Master\MasterSubUnsurSpip;
use App\Models\Master\MasterSumberData;
use App\Models\Master\MasterTingkatRisiko;
use App\Models\Master\MasterUnsurSpip;
use App\Models\Master\MasterUrusanPemerintahan;
use App\Models\Opd;
use App\Services\Audit\AuditLogService;
use App\Services\Export\ExcelExportService;
use App\Services\Master\MasterDataService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

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
            'model' => MasterUrusanPemerintahan::class,
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
        protected AuditLogService $auditLogService,
        protected MasterDataService $masterDataService
    ) {}

    /**
     * Get entity configuration or abort 404.
     */
    protected function getEntityConfig(string $entity): array
    {
        if (! isset(self::ENTITY_CONFIG[$entity])) {
            abort(404, "Master data entity '{$entity}' tidak ditemukan atau tidak diizinkan.");
        }

        return self::ENTITY_CONFIG[$entity];
    }

    /**
     * Determine whether the user is authorized to read master data reference.
     * Full access requires 'master.view'.
     * Operational read-only reference access is granted to users with risk or planning permissions.
     */
    protected function authorizeMasterRead(Request $request): bool
    {
        $user = $request->user();
        if (! $user) {
            return false;
        }

        // Full management access
        if ($user->can('master.view')) {
            return true;
        }

        // Scoped reference / lookup read access for operational forms
        return $user->hasAnyPermission([
            'konteks_risiko.view',
            'konteks_risiko.create',
            'konteks_risiko.edit',
            'konteks_operasional.view',
            'konteks_operasional.create',
            'konteks_operasional.edit',
            'tujuan.view',
            'tujuan.create',
            'tujuan.edit',
        ]);
    }

    /**
     * List all entities.
     */
    public function index(Request $request, string $entity): JsonResponse
    {
        $user = $request->user();
        if (! $this->authorizeMasterRead($request)) {
            return response()->json(['message' => 'Anda tidak memiliki izin untuk melihat master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        /** @var Builder $query */
        $query = $config['model']::query();

        if (isset($config['with'])) {
            $query->with($config['with']);
        }

        if ($request->has('search') && ! empty($request->query('search'))) {
            $term = trim((string) $request->query('search'));
            $query->where(function ($q) use ($term, $config, $entity) {
                $q->where('nama', 'like', "%{$term}%");
                if (! empty($config['has_code'])) {
                    $q->orWhere('kode', 'like', "%{$term}%");
                }
                if ($entity === 'opd') {
                    $q->orWhere('kepala', 'like', "%{$term}%")
                        ->orWhere('kategori', 'like', "%{$term}%");
                }
            });
        }

        // Security safeguard:
        // Operational users without 'master.view' can strictly only access active reference records
        $hasMasterView = $user?->can('master.view');
        if (! $hasMasterView) {
            $query->where('is_active', true);
        } elseif ($request->has('is_active') && $request->query('is_active') !== 'all') {
            $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($entity === 'opd' && $request->has('kategori') && ! empty($request->query('kategori')) && $request->query('kategori') !== 'all') {
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
    public function export(Request $request, string $entity, ExcelExportService $exportService): StreamedResponse
    {
        if (! $request->user()->can('master.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor data master.');
        }

        $config = $this->getEntityConfig($entity);
        /** @var Builder $query */
        $query = $config['model']::query();

        if (isset($config['with'])) {
            $query->with($config['with']);
        }

        if ($request->has('search') && ! empty($request->query('search'))) {
            $term = trim((string) $request->query('search'));
            $query->where(function ($q) use ($term, $config, $entity) {
                $q->where('nama', 'like', "%{$term}%");
                if (! empty($config['has_code'])) {
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
        if (! empty($config['has_code'])) {
            $headers[] = 'Kode';
        }
        if ($entity === 'unsur-spip') {
            $headers[] = 'Nomor SPIP';
        }
        $headers[] = 'Nama '.$config['label'];

        if (! empty($config['desc_field'])) {
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
        $hasCode = ! empty($config['has_code']);

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
        if ($request->has('search') && ! empty($request->query('search'))) {
            $metadata['Kata Kunci Pencarian'] = $request->query('search');
        }

        return $exportService->streamExport(
            filename: 'Master_Data_'.Str::slug($config['label'], '_'),
            title: 'LAPORAN MASTER DATA: '.mb_strtoupper($config['label']),
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
        $user = $request->user();
        if (! $this->authorizeMasterRead($request)) {
            return response()->json(['message' => 'Anda tidak memiliki izin untuk melihat master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        $query = $config['model']::query();

        if (isset($config['with'])) {
            $query->with($config['with']);
        }

        $hasMasterView = $user?->can('master.view');
        if (! $hasMasterView) {
            $query->where('is_active', true);
        }

        $item = $query->findOrFail($id);

        return response()->json(['data' => $item]);
    }

    /**
     * Reorder master data items.
     */
    public function reorder(ReorderMasterDataRequest $request, string $entity): JsonResponse
    {
        $user = $request->user() ?? auth('sanctum')->user();
        $config = $this->getEntityConfig($entity);

        $this->masterDataService->reorder($config, $entity, $request->validated('ids'), $user);

        return response()->json([
            'message' => "Urutan data {$config['label']} berhasil diperbarui.",
        ]);
    }

    /**
     * Store new record.
     */
    public function store(Request $request, string $entity): JsonResponse
    {
        if (! $request->user()->can('master.create')) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk menambah master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        $rules = $this->masterDataService->buildValidationRules($config, $entity);
        $validated = $request->validate($rules);

        $item = $this->masterDataService->create($config, $entity, $validated, $request->user());

        return response()->json([
            'message' => "Data {$config['label']} berhasil ditambahkan.",
            'data' => $item,
        ], 201);
    }

    /**
     * Update existing record.
     */
    public function update(Request $request, string $entity, string $id): JsonResponse
    {
        if (! $request->user()->can('master.edit')) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk mengubah master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        $item = $config['model']::findOrFail($id);

        $rules = $this->masterDataService->buildValidationRules($config, $entity, $id);
        $validated = $request->validate($rules);

        $item = $this->masterDataService->update($config, $entity, $item, $validated, $request->user());

        return response()->json([
            'message' => "Data {$config['label']} berhasil diperbarui.",
            'data' => $item,
        ]);
    }

    /**
     * Toggle active status.
     */
    public function toggleActive(Request $request, string $entity, string $id): JsonResponse
    {
        if (! $request->user()->can('master.edit')) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk mengubah status master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        $item = $config['model']::findOrFail($id);

        $item = $this->masterDataService->toggleActive($config, $entity, $item, $request->user());
        $statusStr = $item->is_active ? 'diaktifkan' : 'dinonaktifkan';

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
        if (! $request->user()->can('master.delete')) {
            return response()->json(['message' => 'Anda tidak memiliki hak akses untuk menghapus master data.'], 403);
        }

        $config = $this->getEntityConfig($entity);
        $item = $config['model']::findOrFail($id);
        $name = (string) $item->nama;

        $this->masterDataService->delete($config, $entity, $item, $request->user());

        return response()->json([
            'message' => "Data {$config['label']} '{$name}' berhasil dihapus.",
        ]);
    }
}
