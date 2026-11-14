<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\ConfirmNihilKejadianRequest;
use App\Http\Requests\Risiko\DestroyKejadianRisikoRequest;
use App\Http\Requests\Risiko\IndexKejadianRisikoRequest;
use App\Http\Requests\Risiko\SaveKejadianRisikoRequest;
use App\Http\Resources\Risiko\KejadianRisikoResource;
use App\Services\Risiko\KejadianRisikoService;
use Illuminate\Http\JsonResponse;

class KejadianRisikoController extends Controller
{
    public function __construct(private readonly KejadianRisikoService $service) {}

    public function index(IndexKejadianRisikoRequest $request): JsonResponse
    {
        $data = $request->validated();
        $result = $this->service->list($data['opd_id'], $data['periode_penilaian_id'], $request->user(), $data);

        return response()->json([
            'data' => KejadianRisikoResource::collection($result['items']),
            'meta' => $result['meta'],
            'is_nihil' => $result['is_nihil'],
            'nihil_info' => $result['nihil_info'],
            'is_complete' => $result['is_complete'],
        ]);
    }

    public function riskOptions(IndexKejadianRisikoRequest $request): JsonResponse
    {
        $data = $request->validated();
        $options = $this->service->getRiskOptions($data['opd_id'], $data['periode_penilaian_id'], $request->user());

        return response()->json([
            'data' => $options,
        ]);
    }

    public function store(SaveKejadianRisikoRequest $request): JsonResponse
    {
        $incident = $this->service->store($request->validated(), $request->user());

        return response()->json([
            'message' => 'Catatan kejadian risiko berhasil disimpan.',
            'data' => new KejadianRisikoResource($incident),
        ], 201);
    }

    public function update(SaveKejadianRisikoRequest $request, string $id): JsonResponse
    {
        $incident = $this->service->update($id, $request->validated(), $request->user());

        return response()->json([
            'message' => 'Catatan kejadian risiko berhasil diperbarui.',
            'data' => new KejadianRisikoResource($incident),
        ]);
    }

    public function destroy(DestroyKejadianRisikoRequest $request, string $id): JsonResponse
    {
        $this->service->destroy($id, $request->user());

        return response()->json([
            'message' => 'Catatan kejadian risiko berhasil dihapus.',
        ]);
    }

    public function confirmNihil(ConfirmNihilKejadianRequest $request): JsonResponse
    {
        $data = $request->validated();
        $status = $this->service->setNihil($data['opd_id'], $data['periode_penilaian_id'], (bool) $data['is_nihil'], $request->user());

        return response()->json([
            'message' => $status->is_nihil
                ? 'Status nihil kejadian risiko berhasil dikonfirmasi.'
                : 'Konfirmasi status nihil kejadian risiko berhasil dibatalkan.',
            'data' => [
                'is_nihil' => $status->is_nihil,
                'confirmed_at' => $status->confirmed_at?->toIso8601String(),
                'confirmed_by' => $status->confirmedBy?->name,
            ],
        ]);
    }
}
