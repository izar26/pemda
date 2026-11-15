<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\ReorderIdentifikasiRisikoOpdOperasionalItemRequest;
use App\Http\Requests\Risiko\SaveIdentifikasiRisikoOpdOperasionalHeaderRequest;
use App\Http\Requests\Risiko\SaveIdentifikasiRisikoOpdOperasionalItemRequest;
use App\Http\Resources\Risiko\IdentifikasiRisikoOpdOperasionalItemResource;
use App\Http\Resources\Risiko\IdentifikasiRisikoOpdOperasionalResource;
use App\Models\Master\MasterUrusanPemerintahan;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasional;
use App\Models\Risiko\IdentifikasiRisikoOpdOperasionalItem;
use App\Models\Risiko\KonteksOperasional;
use App\Policies\Risiko\IdentifikasiRisikoPolicy;
use App\Services\Risiko\IdentifikasiRisikoOpdOperasionalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IdentifikasiRisikoOpdOperasionalController extends Controller
{
    public function __construct(
        protected IdentifikasiRisikoOpdOperasionalService $service,
        protected IdentifikasiRisikoPolicy $policy
    ) {}

    /**
     * Get current OPD Form 3C for active period, including Form 2C sub-kegiatans reference metadata.
     */
    public function current(Request $request): JsonResponse
    {
        $user = $request->user();
        $canView = $user?->can('identifikasi_risiko_opd_operasional.view')
            || $user?->can('review_risiko.view')
            || $user?->can('laporan.view')
            || $user?->hasRole(['Auditor', 'Inspektorat', 'Superadmin', 'Admin Office']);

        if (! $canView) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat Form 3C.');
        }

        $targetOpdId = $request->get('opd_id');
        if ($user && $user->isRestrictedToOpd()) {
            $targetOpdId = $user->opd_id;
        }

        if ($user->isScopedAuditor() && ! empty($targetOpdId) && ! $user->canReadOpdData((string) $targetOpdId)) {
            abort(403, 'Anda tidak ditugaskan sebagai auditor pada perangkat daerah ini.');
        }

        if (empty($targetOpdId)) {
            return response()->json([
                'data' => null,
                'message' => 'OPD ID belum ditentukan.',
            ], 200);
        }

        $periodeId = $request->get('periode_penilaian_id');
        $resolvedPeriodeId = $this->service->resolvePeriodeId($periodeId);
        $dokumen = $this->service->getCurrentDokumen((string) $targetOpdId, $resolvedPeriodeId);

        // Fetch Form 2C for this OPD in this period to link Programs, Kegiatans, and Sub-Kegiatans
        $konteks2c = KonteksOperasional::where('opd_id', $targetOpdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->with(['items.parent.parent', 'items.indikators'])
            ->first();

        $form2cSubKegiatans = [];
        if ($konteks2c && $konteks2c->items) {
            $subKegiatans = $konteks2c->items->where('jenis', 'sub_kegiatan');
            foreach ($subKegiatans as $sub) {
                $kegiatan = $sub->parent;
                $program = $kegiatan?->parent;

                $firstIndikator = $sub->indikators->first();
                $indikatorStr = $firstIndikator
                    ? $firstIndikator->indikator.($firstIndikator->target ? ' (Target: '.$firstIndikator->target.' '.$firstIndikator->satuan.')' : '')
                    : null;

                $form2cSubKegiatans[] = [
                    'id' => $sub->id,
                    'kode' => $sub->kode,
                    'nama' => $sub->nama,
                    'kegiatan_nama' => $kegiatan ? ($kegiatan->kode ? $kegiatan->kode.' ' : '').$kegiatan->nama : null,
                    'program_nama' => $program ? ($program->kode ? $program->kode.' ' : '').$program->nama : null,
                    'indikator_keluaran' => $indikatorStr,
                ];
            }
        }

        $urusanList = MasterUrusanPemerintahan::where('is_active', true)
            ->orderBy('urutan', 'asc')
            ->select(['id', 'kode', 'nama'])
            ->get();

        return response()->json([
            'data' => $dokumen ? new IdentifikasiRisikoOpdOperasionalResource($dokumen) : null,
            'meta' => [
                'form_2c_exists' => $konteks2c !== null,
                'sub_kegiatans_from_2c' => $form2cSubKegiatans,
                'pemilik_risiko_options' => $this->service->pemilikRisikoOptions(),
                'probis_options' => [
                    'Perencanaan',
                    'Penganggaran',
                    'Pelaksanaan',
                    'Pengadaan / Penatausahaan',
                    'Pelaporan',
                    'Pengawasan / Evaluasi',
                ],
                'urusan_pemerintahans' => $urusanList,
                'kategori_options' => array_keys(IdentifikasiRisikoOpdOperasionalService::KATEGORI_KODE_MAP),
            ],
        ]);
    }

    /**
     * Create or update Form 3C header.
     */
    public function saveHeader(SaveIdentifikasiRisikoOpdOperasionalHeaderRequest $request): JsonResponse
    {
        $dokumen = $this->service->saveHeader($request->validated(), $request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Identitas Form 3C (Risiko Operasional OPD) berhasil disimpan.',
            'data' => new IdentifikasiRisikoOpdOperasionalResource($dokumen),
        ]);
    }

    /**
     * Add a risk item to Form 3C.
     */
    public function storeItem(SaveIdentifikasiRisikoOpdOperasionalItemRequest $request, IdentifikasiRisikoOpdOperasional $dokumen): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->policy->edit($user, (string) $dokumen->opd_id, '3c'), 403, 'Anda tidak memiliki hak akses untuk menambah butir risiko operasional pada perangkat daerah ini.');

        $item = $this->service->storeItem($dokumen, $request->validated(), $user);

        return response()->json([
            'status' => 'success',
            'message' => "Risiko {$item->kode_risiko} berhasil ditambahkan.",
            'data' => new IdentifikasiRisikoOpdOperasionalItemResource($item),
        ], 201);
    }

    /**
     * Update a risk item in Form 3C.
     */
    public function updateItem(SaveIdentifikasiRisikoOpdOperasionalItemRequest $request, IdentifikasiRisikoOpdOperasional $dokumen, IdentifikasiRisikoOpdOperasionalItem $item): JsonResponse
    {
        if ($item->identifikasi_risiko_opd_operasional_id !== $dokumen->id) {
            abort(404, 'Item risiko tidak ditemukan pada dokumen ini.');
        }

        $user = $request->user();
        abort_unless($this->policy->edit($user, (string) $dokumen->opd_id, '3c'), 403, 'Anda tidak memiliki hak akses untuk mengubah butir risiko operasional pada perangkat daerah ini.');

        $updated = $this->service->updateItem($item, $request->validated(), $user);

        return response()->json([
            'status' => 'success',
            'message' => "Risiko {$updated->kode_risiko} berhasil diperbarui.",
            'data' => new IdentifikasiRisikoOpdOperasionalItemResource($updated),
        ]);
    }

    /**
     * Delete a risk item in Form 3C.
     */
    public function destroyItem(Request $request, IdentifikasiRisikoOpdOperasional $dokumen, IdentifikasiRisikoOpdOperasionalItem $item): JsonResponse
    {
        if ($item->identifikasi_risiko_opd_operasional_id !== $dokumen->id) {
            abort(404, 'Item risiko tidak ditemukan pada dokumen ini.');
        }

        $user = $request->user();
        abort_unless($this->policy->delete($user, (string) $dokumen->opd_id, '3c'), 403, 'Anda tidak memiliki hak akses untuk menghapus butir risiko operasional pada perangkat daerah ini.');

        $this->service->deleteItem($item, $user);

        return response()->json([
            'status' => 'success',
            'message' => 'Butir risiko operasional berhasil dihapus.',
        ]);
    }

    /**
     * Reorder risk items in Form 3C.
     */
    public function reorderItems(ReorderIdentifikasiRisikoOpdOperasionalItemRequest $request, IdentifikasiRisikoOpdOperasional $dokumen): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->policy->edit($user, (string) $dokumen->opd_id, '3c'), 403, 'Anda tidak memiliki hak akses untuk mengatur ulang urutan risiko operasional pada perangkat daerah ini.');

        $this->service->reorderItems($dokumen, $request->validated('item_ids'), $user);

        return response()->json([
            'status' => 'success',
            'message' => 'Urutan risiko operasional berhasil diperbarui.',
        ]);
    }
}
