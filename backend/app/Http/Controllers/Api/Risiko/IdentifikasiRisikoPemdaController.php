<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\ReorderIdentifikasiRisikoPemdaItemRequest;
use App\Http\Requests\Risiko\SaveIdentifikasiRisikoPemdaHeaderRequest;
use App\Http\Requests\Risiko\SaveIdentifikasiRisikoPemdaItemRequest;
use App\Http\Resources\Risiko\IdentifikasiRisikoPemdaItemResource;
use App\Http\Resources\Risiko\IdentifikasiRisikoPemdaResource;
use App\Models\Master\MasterPemilikRisiko;
use App\Models\Master\MasterUrusanPemerintahan;
use App\Models\Risiko\IdentifikasiRisikoPemda;
use App\Models\Risiko\IdentifikasiRisikoPemdaItem;
use App\Models\Risiko\KonteksPenilaian;
use App\Policies\Risiko\IdentifikasiRisikoPolicy;
use App\Services\Risiko\IdentifikasiRisikoPemdaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IdentifikasiRisikoPemdaController extends Controller
{
    public function __construct(
        protected IdentifikasiRisikoPemdaService $service,
        protected IdentifikasiRisikoPolicy $policy
    ) {}

    /**
     * Get current OPD Form 3A for active period, including Form 2B reference metadata.
     */
    public function current(Request $request): JsonResponse
    {
        $user = $request->user();
        $canView = $user?->can('identifikasi_risiko_pemda.view')
            || $user?->can('review_risiko.view')
            || $user?->can('laporan.view')
            || $user?->hasRole(['Auditor', 'Inspektorat', 'Superadmin', 'Admin Office']);

        if (! $canView) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat Form 3A.');
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
                    'indikators' => $s->indikators->map(fn ($ind) => [
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

        $pemilikRisikoList = MasterPemilikRisiko::where('is_active', true)
            ->orderBy('urutan', 'asc')
            ->select(['id', 'nama'])
            ->get();

        return response()->json([
            'data' => $dokumen ? new IdentifikasiRisikoPemdaResource($dokumen) : null,
            'meta' => [
                'form_2b_exists' => $konteks2b !== null,
                'tujuan_strategis' => $konteks2b?->tujuan?->tujuan,
                'sasarans_from_2b' => $form2bSasarans,
                'urusan_pemerintahans' => $urusanList,
                'pemilik_risiko_options' => $pemilikRisikoList,
                'kategori_options' => array_keys(IdentifikasiRisikoPemdaService::KATEGORI_KODE_MAP),
            ],
        ]);
    }

    /**
     * Create or update Form 3A header.
     */
    public function saveHeader(SaveIdentifikasiRisikoPemdaHeaderRequest $request): JsonResponse
    {
        $dokumen = $this->service->saveHeader($request->validated(), $request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Identitas Form 3A (Urusan Pemerintahan) berhasil disimpan.',
            'data' => new IdentifikasiRisikoPemdaResource($dokumen),
        ]);
    }

    /**
     * Add a risk item to Form 3A.
     */
    public function storeItem(SaveIdentifikasiRisikoPemdaItemRequest $request, IdentifikasiRisikoPemda $dokumen): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->policy->edit($user, (string) $dokumen->opd_id, '3a'), 403, 'Anda tidak memiliki hak akses untuk menambah butir risiko pada perangkat daerah ini.');

        $item = $this->service->storeItem($dokumen, $request->validated(), $user);

        return response()->json([
            'status' => 'success',
            'message' => "Risiko {$item->kode_risiko} berhasil ditambahkan.",
            'data' => new IdentifikasiRisikoPemdaItemResource($item),
        ], 201);
    }

    /**
     * Update a risk item in Form 3A.
     */
    public function updateItem(SaveIdentifikasiRisikoPemdaItemRequest $request, IdentifikasiRisikoPemda $dokumen, IdentifikasiRisikoPemdaItem $item): JsonResponse
    {
        if ($item->identifikasi_risiko_pemda_id !== $dokumen->id) {
            abort(404, 'Item risiko tidak ditemukan pada dokumen ini.');
        }

        $user = $request->user();
        abort_unless($this->policy->edit($user, (string) $dokumen->opd_id, '3a'), 403, 'Anda tidak memiliki hak akses untuk mengubah butir risiko pada perangkat daerah ini.');

        $updated = $this->service->updateItem($item, $request->validated(), $user);

        return response()->json([
            'status' => 'success',
            'message' => "Risiko {$updated->kode_risiko} berhasil diperbarui.",
            'data' => new IdentifikasiRisikoPemdaItemResource($updated),
        ]);
    }

    /**
     * Delete a risk item in Form 3A.
     */
    public function destroyItem(Request $request, IdentifikasiRisikoPemda $dokumen, IdentifikasiRisikoPemdaItem $item): JsonResponse
    {
        if ($item->identifikasi_risiko_pemda_id !== $dokumen->id) {
            abort(404, 'Item risiko tidak ditemukan pada dokumen ini.');
        }

        $user = $request->user();
        abort_unless($this->policy->delete($user, (string) $dokumen->opd_id, '3a'), 403, 'Anda tidak memiliki hak akses untuk menghapus butir risiko pada perangkat daerah ini.');

        $this->service->destroyItem($item, $user);

        return response()->json([
            'status' => 'success',
            'message' => 'Butir risiko berhasil dihapus.',
        ]);
    }

    /**
     * Reorder risk items in Form 3A.
     */
    public function reorderItems(ReorderIdentifikasiRisikoPemdaItemRequest $request, IdentifikasiRisikoPemda $dokumen): JsonResponse
    {
        $user = $request->user();
        abort_unless($this->policy->edit($user, (string) $dokumen->opd_id, '3a'), 403, 'Anda tidak memiliki hak akses untuk mengatur ulang urutan risiko pada perangkat daerah ini.');

        $this->service->reorderItems($dokumen, $request->validated('item_ids'), $user);

        return response()->json([
            'status' => 'success',
            'message' => 'Urutan risiko berhasil diperbarui.',
        ]);
    }
}
