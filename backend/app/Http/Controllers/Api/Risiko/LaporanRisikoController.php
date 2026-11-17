<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\LaporanRisikoRequest;
use App\Services\Risiko\LaporanRisikoService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LaporanRisikoController extends Controller
{
    public function __construct(
        protected LaporanRisikoService $service
    ) {}

    /**
     * Mengambil lembar data laporan risiko OPD untuk formulir tertentu.
     */
    public function show(LaporanRisikoRequest $request, string $form_code): JsonResponse
    {
        $validated = $request->validated();
        $opdId = isset($validated['opd_id']) ? (string) $validated['opd_id'] : null;
        $tahun = isset($validated['tahun']) ? (int) $validated['tahun'] : null;

        $data = $this->service->getLaporan($form_code, $opdId, $tahun, $request->user());

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Ekspor lembar laporan risiko OPD ke format Excel (.xlsx) resmi.
     */
    public function exportExcel(LaporanRisikoRequest $request, string $form_code): StreamedResponse
    {
        $validated = $request->validated();
        $opdId = isset($validated['opd_id']) ? (string) $validated['opd_id'] : null;
        $tahun = isset($validated['tahun']) ? (int) $validated['tahun'] : null;

        return $this->service->exportExcel($form_code, $opdId, $tahun, $request->user());
    }
}
