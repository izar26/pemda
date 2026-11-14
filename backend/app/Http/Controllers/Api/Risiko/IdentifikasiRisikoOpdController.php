<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\ReorderIdentifikasiRisikoOpdItemRequest;
use App\Http\Requests\Risiko\SaveIdentifikasiRisikoOpdHeaderRequest;
use App\Http\Requests\Risiko\SaveIdentifikasiRisikoOpdItemRequest;
use App\Http\Resources\Risiko\IdentifikasiRisikoOpdItemResource;
use App\Http\Resources\Risiko\IdentifikasiRisikoOpdResource;
use App\Models\Master\MasterUrusanPemerintahan;
use App\Models\Risiko\IdentifikasiRisikoOpd;
use App\Models\Risiko\IdentifikasiRisikoOpdItem;
use App\Models\Risiko\KonteksPenilaian;
use App\Policies\Risiko\IdentifikasiRisikoPolicy;
use App\Services\Risiko\IdentifikasiRisikoOpdService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IdentifikasiRisikoOpdController extends Controller
{
    public function __construct(
        protected IdentifikasiRisikoOpdService $service,
        protected IdentifikasiRisikoPolicy $policy
    ) {}

    /**
     * Get current OPD Form 3B for active period, including Form 2B reference metadata.
     */
    public function current(Request $request): JsonResponse
    {
        $user = $request->user();
        $canView = $user?->can('identifikasi_risiko_opd.view')
            || $user?->can('review_risiko.view')
            || $user?->can('laporan.view')
            || $user?->hasRole(['Auditor', 'Inspektorat', 'Superadmin', 'Admin Office']);

        if (! $canView) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat Form 3B.');
        }

        $targetOpdId = $request->get('opd_id');
        if ($user && $user->hasRole('OPD') && ! $user->hasRole(['Superadmin', 'Admin Office'])) {
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

        // Fetch Form 2B for this OPD in this period to link Tujuan, Sasarans, and Indikators
        $konteks2b = KonteksPenilaian::where('opd_id', $targetOpdId)
            ->where('periode_penilaian_id', $resolvedPeriodeId)
            ->with(['tujuan', 'sasarans.indikators', 'indikators'])
            ->first();

        $form2bSasarans = [];
        if ($konteks2b) {
            foreach ($konteks2b->sasarans as $s) {
                $form2bSasarans[] = [
                    'id' => $s->id,
                    'kode_sasaran' => $s->kode_sasaran,
                    'sasaran' => $s->sasaran,
                    'indikators' => $s->indikators->whereIn('id', $konteks2b->indikators->pluck('id'))->values()->map(fn ($ind) => [
                        'id' => $ind->id,
                        'kode_indikator' => $ind->kode_indikator,
                        'indikator' => $ind->indikator,
                    ]),
                ];
            }
        }

        $urusanList = MasterUrusanPemerintahan::where('is_active', true)
            ->orderBy('urutan', 'asc')
            ->select(['id', 'kode', 'nama'])
            ->get();

        return response()->json([
            'data' => $dokumen ? new IdentifikasiRisikoOpdResource($dokumen) : null,
            'meta' => [
                'form_2b_exists' => $konteks2b !== null,
                'tujuan_strategis' => $konteks2b?->tujuan?->tujuan,
                'sasarans_from_2b' => $form2bSasarans,
                'urusan_pemerintahans' => $urusanList,
                'pemilik_risiko_options' => $this->service->pemilikRisikoOptions(),
                'kategori_options' => array_keys(IdentifikasiRisikoOpdService::KATEGORI_KODE_MAP),
            ],
        ]);
    }

    /**
     * Create or update Form 3B header.
     */
    public function saveHeader(SaveIdentifikasiRisikoOpdHeaderRequest $request): JsonResponse
    {
        $dokumen = $this->service->saveHeader($request->validated(), $request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Identitas Form 3B (Risiko Strategis OPD) berhasil disimpan.',
            'data' => new IdentifikasiRisikoOpdResource($dokumen),
        ]);
    }

    /**
     * Add a risk item to Form 3B.
     */
    public function storeItem(SaveIdentifikasiRisikoOpdItemRequest $request, IdentifikasiRisikoOpd $dokumen): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->policy->edit($user, (string) $dokumen->opd_id, '3b'), 403, 'Anda tidak memiliki hak akses untuk menambah butir risiko pada perangkat daerah ini.');

        $item = $this->service->storeItem($dokumen, $request->validated(), $user);

        return response()->json([
            'status' => 'success',
            'message' => "Risiko {$item->kode_risiko} berhasil ditambahkan.",
            'data' => new IdentifikasiRisikoOpdItemResource($item),
        ], 201);
    }

    /**
     * Update a risk item in Form 3B.
     */
    public function updateItem(SaveIdentifikasiRisikoOpdItemRequest $request, IdentifikasiRisikoOpd $dokumen, IdentifikasiRisikoOpdItem $item): JsonResponse
    {
        if ($item->identifikasi_risiko_opd_id !== $dokumen->id) {
            abort(404, 'Item risiko tidak ditemukan pada dokumen ini.');
        }

        $user = $request->user();
        abort_unless($this->policy->edit($user, (string) $dokumen->opd_id, '3b'), 403, 'Anda tidak memiliki hak akses untuk mengubah butir risiko pada perangkat daerah ini.');

        $updated = $this->service->updateItem($item, $request->validated(), $user);

        return response()->json([
            'status' => 'success',
            'message' => "Risiko {$updated->kode_risiko} berhasil diperbarui.",
            'data' => new IdentifikasiRisikoOpdItemResource($updated),
        ]);
    }

    /**
     * Delete a risk item in Form 3B.
     */
    public function destroyItem(Request $request, IdentifikasiRisikoOpd $dokumen, IdentifikasiRisikoOpdItem $item): JsonResponse
    {
        if ($item->identifikasi_risiko_opd_id !== $dokumen->id) {
            abort(404, 'Item risiko tidak ditemukan pada dokumen ini.');
        }

        $user = $request->user();
        abort_unless($this->policy->delete($user, (string) $dokumen->opd_id, '3b'), 403, 'Anda tidak memiliki hak akses untuk menghapus butir risiko pada perangkat daerah ini.');

        $this->service->destroyItem($item, $user);

        return response()->json([
            'status' => 'success',
            'message' => 'Butir risiko berhasil dihapus.',
        ]);
    }

    /**
     * Reorder risk items in Form 3B.
     */
    public function reorderItems(ReorderIdentifikasiRisikoOpdItemRequest $request, IdentifikasiRisikoOpd $dokumen): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->policy->edit($user, (string) $dokumen->opd_id, '3b'), 403, 'Anda tidak memiliki hak akses untuk mengatur ulang urutan risiko pada perangkat daerah ini.');

        $this->service->reorderItems($dokumen, $request->validated('item_ids'), $user);

        return response()->json([
            'status' => 'success',
            'message' => 'Urutan risiko berhasil diperbarui.',
        ]);
    }
}
