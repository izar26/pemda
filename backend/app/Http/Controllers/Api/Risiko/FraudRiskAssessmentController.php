<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\ConfirmNihilFraRequest;
use App\Http\Requests\Risiko\DestroyFraudRiskAssessmentRequest;
use App\Http\Requests\Risiko\IndexFraudRiskAssessmentRequest;
use App\Http\Requests\Risiko\SaveFraudRiskAssessmentRequest;
use App\Http\Resources\Risiko\FraudRiskAssessmentResource;
use App\Services\Risiko\FraudRiskAssessmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FraudRiskAssessmentController extends Controller
{
    public function __construct(private readonly FraudRiskAssessmentService $service) {}

    public function index(IndexFraudRiskAssessmentRequest $request): JsonResponse
    {
        $data = $request->validated();
        $result = $this->service->list($data['opd_id'], $data['periode_penilaian_id'], $request->user(), $data);

        return response()->json([
            'data' => FraudRiskAssessmentResource::collection($result['items']),
            'meta' => $result['meta'],
            'is_nihil' => $result['is_nihil'],
            'nihil_info' => $result['nihil_info'],
            'is_complete' => $result['is_complete'],
        ]);
    }

    public function referenceOptions(Request $request): JsonResponse
    {
        $options = $this->service->getReferenceOptions($request->user());

        return response()->json([
            'data' => $options,
        ]);
    }

    public function store(SaveFraudRiskAssessmentRequest $request): JsonResponse
    {
        $item = $this->service->store($request->validated(), $request->user());

        return response()->json([
            'message' => 'Catatan penilaian risiko kecurangan (FRA) berhasil disimpan.',
            'data' => new FraudRiskAssessmentResource($item),
        ], 201);
    }

    public function update(SaveFraudRiskAssessmentRequest $request, string $id): JsonResponse
    {
        $item = $this->service->update($id, $request->validated(), $request->user());

        return response()->json([
            'message' => 'Catatan penilaian risiko kecurangan (FRA) berhasil diperbarui.',
            'data' => new FraudRiskAssessmentResource($item),
        ]);
    }

    public function destroy(DestroyFraudRiskAssessmentRequest $request, string $id): JsonResponse
    {
        $this->service->destroy($id, $request->user());

        return response()->json([
            'message' => 'Catatan penilaian risiko kecurangan (FRA) berhasil dihapus.',
        ]);
    }

    public function confirmNihil(ConfirmNihilFraRequest $request): JsonResponse
    {
        $data = $request->validated();
        $result = $this->service->setNihil(
            $data['opd_id'],
            $data['periode_penilaian_id'],
            $data['is_nihil'],
            $request->user(),
            $data['catatan'] ?? null
        );

        $message = $data['is_nihil']
            ? 'Pernyataan status nihil risiko kecurangan berhasil dikonfirmasi.'
            : 'Status nihil risiko kecurangan berhasil dibatalkan.';

        return response()->json([
            'message' => $message,
            'data' => $result,
        ]);
    }
}
