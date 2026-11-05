<?php

declare(strict_types=1);

namespace App\Services\Master;

use App\Models\Master\MasterSumberData;
use App\Models\Master\MasterUnsurSpip;
use App\Models\Opd;
use App\Services\Audit\AuditLogService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MasterDataService
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

    /**
     * Reorder master data records.
     *
     * @param  array<string, mixed>  $config
     * @param  string[]  $ids
     */
    public function reorder(array $config, string $entity, array $ids, object $user): void
    {
        if ($entity === 'sub-unsur-spip') {
            $distinctUnsurCount = $config['model']::whereIn('id', $ids)
                ->distinct('unsur_spip_id')
                ->count('unsur_spip_id');
            if ($distinctUnsurCount > 1) {
                throw new HttpResponseException(response()->json([
                    'message' => 'Semua Sub-Unsur yang diurutkan harus berada di bawah Unsur SPIP yang sama.',
                ], 422));
            }
        }

        DB::transaction(function () use ($config, $ids, $entity, $user) {
            foreach ($ids as $index => $id) {
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
                    'count' => count($ids),
                    'ids' => $ids,
                ],
                auditableType: $config['model'],
            );
        });
    }

    /**
     * Store new master data record.
     *
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $validated
     */
    public function create(array $config, string $entity, array $validated, object $user): Model
    {
        if (! isset($validated['urutan']) || $validated['urutan'] === null) {
            $maxQuery = $config['model']::query();
            if ($entity === 'sub-unsur-spip' && ! empty($validated['unsur_spip_id'])) {
                $maxQuery->where('unsur_spip_id', $validated['unsur_spip_id']);
            }
            $validated['urutan'] = ((int) $maxQuery->max('urutan')) + 1;
        }

        return DB::transaction(function () use ($config, $entity, $validated, $user) {
            /** @var Model $item */
            $item = $config['model']::create($validated);

            $this->auditLogService->log(
                action: 'MASTER_DATA_CREATE',
                module: 'Master Data',
                description: "Menambahkan entri baru pada {$config['label']}: {$item->nama}",
                user: $user,
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

            return $item;
        });
    }

    /**
     * Update existing master data record.
     *
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $validated
     */
    public function update(array $config, string $entity, Model $item, array $validated, object $user): Model
    {
        if (array_key_exists('is_active', $validated)) {
            $newActive = (bool) $validated['is_active'];
            if ($item->is_active && ! $newActive) {
                $blocker = $this->getDeactivationBlockerMessage($entity, $item);
                if ($blocker !== null) {
                    throw new HttpResponseException(response()->json(['message' => $blocker], 422));
                }
            } elseif (! $item->is_active && $newActive && $entity === 'sub-unsur-spip') {
                $unsurId = $validated['unsur_spip_id'] ?? $item->unsur_spip_id;
                $unsur = MasterUnsurSpip::find($unsurId);
                if ($unsur && ! $unsur->is_active) {
                    throw new HttpResponseException(response()->json([
                        'message' => "Tidak dapat mengaktifkan Sub-Unsur SPIP '{$item->nama}' karena Unsur SPIP induknya sedang berstatus nonaktif.",
                    ], 422));
                }
            }
        }

        if (! array_key_exists('urutan', $validated) || $validated['urutan'] === null) {
            unset($validated['urutan']);
        }

        return DB::transaction(function () use ($config, $entity, $item, $validated, $user) {
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
                user: $user,
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

            return $item;
        });
    }

    /**
     * Toggle active status.
     *
     * @param  array<string, mixed>  $config
     */
    public function toggleActive(array $config, string $entity, Model $item, object $user): Model
    {
        if ($item->is_active) {
            $blocker = $this->getDeactivationBlockerMessage($entity, $item);
            if ($blocker !== null) {
                throw new HttpResponseException(response()->json(['message' => $blocker], 422));
            }
        } elseif ($entity === 'sub-unsur-spip') {
            $unsur = $item->unsurSpip;
            if ($unsur && ! $unsur->is_active) {
                throw new HttpResponseException(response()->json([
                    'message' => "Tidak dapat mengaktifkan Sub-Unsur SPIP '{$item->nama}' karena Unsur SPIP induknya ('{$unsur->nama}') sedang berstatus nonaktif.",
                ], 422));
            }
        }

        $oldStatus = $item->is_active;
        $item->is_active = ! $item->is_active;
        $item->save();

        $statusStr = $item->is_active ? 'diaktifkan' : 'dinonaktifkan';

        $this->auditLogService->log(
            action: 'MASTER_DATA_TOGGLE',
            module: 'Master Data',
            description: "Status entri {$config['label']} '{$item->nama}' berhasil {$statusStr}",
            user: $user,
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

        return $item;
    }

    /**
     * Delete master data record.
     *
     * @param  array<string, mixed>  $config
     */
    public function delete(array $config, string $entity, Model $item, object $user): void
    {
        $blocker = $this->getDeletionBlockerMessage($entity, $item);
        if ($blocker !== null) {
            throw new HttpResponseException(response()->json(['message' => $blocker], 422));
        }

        $name = (string) $item->nama;
        $id = (string) $item->id;

        DB::transaction(function () use ($config, $entity, $item, $name, $id, $user) {
            $snapshot = $item->toArray();
            $item->delete();

            $this->auditLogService->log(
                action: 'MASTER_DATA_DELETE',
                module: 'Master Data',
                description: "Menghapus entri pada {$config['label']}: {$name}",
                user: $user,
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
        });
    }

    /**
     * Build dynamic validation rules based on entity config.
     *
     * @param  array<string, mixed>  $config
     * @return array<string, mixed>
     */
    public function buildValidationRules(array $config, string $entity, ?string $ignoreId = null): array
    {
        $rules = [
            'nama' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'urutan' => ['nullable', 'integer', 'min:0'],
        ];

        if (! empty($config['has_code'])) {
            $codeRule = ['required', 'string', 'max:50'];
            if ($entity === 'kategori-risiko' || $entity === 'tingkat-risiko' || $entity === 'opd') {
                $codeRule[] = Rule::unique($config['table'], 'kode')->ignore($ignoreId);
            }
            $rules['kode'] = $codeRule;
        }

        if (! empty($config['desc_field'])) {
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

    /**
     * Check if a master data item cannot be deactivated because it is used in the active period or has active children.
     */
    public function getDeactivationBlockerMessage(string $entity, object $item): ?string
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
    public function getDeletionBlockerMessage(string $entity, object $item): ?string
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
}
