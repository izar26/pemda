<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\SaveRootCauseAnalysisRequest;
use App\Http\Resources\Risiko\RootCauseAnalysisResource;
use App\Models\Risiko\RootCauseAnalysis;
use App\Services\Risiko\RootCauseAnalysisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RootCauseAnalysisController extends Controller
{
    public function __construct(
        protected RootCauseAnalysisService $service
    ) {}

    /**
     * Get all RCA records for target OPD in active evaluation period.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $canView = $user?->can('rca.view')
            || $user?->can('identifikasi_risiko_pemda.view')
            || $user?->can('identifikasi_risiko_opd.view')
            || $user?->can('review_risiko.view')
            || $user?->can('laporan.view')
            || $user?->hasRole(['Auditor', 'Inspektorat', 'Superadmin', 'Admin Office']);

        if (! $canView) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat lembar RCA.');
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
                'data' => [],
                'message' => 'OPD ID belum ditentukan.',
            ], 200);
        }

        $periodeId = $request->get('periode_penilaian_id');
        $sourceType = $request->get('source_type');
        $rcaList = $this->service->getRcaListByOpd((string) $targetOpdId, $periodeId, $sourceType);

        return response()->json([
            'data' => RootCauseAnalysisResource::collection($rcaList),
        ]);
    }

    /**
     * Get or create RCA for a specific risk item across 3A, 3B, or 3C.
     */
    public function show(Request $request, string $item): JsonResponse
    {
        $rca = $this->service->getOrCreateRcaByItem($item, $request->user());

        return response()->json([
            'data' => new RootCauseAnalysisResource($rca),
        ]);
    }

    /**
     * Update 5-Whys analysis, auto-derive root cause, and set control activity.
     */
    public function update(SaveRootCauseAnalysisRequest $request, RootCauseAnalysis $rca): JsonResponse
    {
        $updated = $this->service->updateRca($rca, $request->validated(), $request->user());

        return response()->json([
            'status' => 'success',
            'message' => 'Analisis akar penyebab (5-Whys) berhasil disimpan.',
            'data' => new RootCauseAnalysisResource($updated),
        ]);
    }
}
