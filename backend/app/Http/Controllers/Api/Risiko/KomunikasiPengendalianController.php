<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\CurrentAnalisisRisikoRequest;
use App\Http\Requests\Risiko\SaveKomunikasiPengendalianRequest;
use App\Http\Resources\Risiko\KomunikasiPengendalianResource;
use App\Services\Risiko\KomunikasiPengendalianService;
use Illuminate\Http\JsonResponse;

class KomunikasiPengendalianController extends Controller
{
    public function __construct(private readonly KomunikasiPengendalianService $service) {}

    public function index(CurrentAnalisisRisikoRequest $request): JsonResponse
    {
        $data = $request->validated();
        $result = $this->service->list($data['opd_id'], $data['periode_penilaian_id'], $request->user(), $data);

        return response()->json([
            'data' => KomunikasiPengendalianResource::collection($result['items']),
            'meta' => $result['pagination'],
        ]);
    }

    public function save(SaveKomunikasiPengendalianRequest $request, string $source, string $item): JsonResponse
    {
        $row = $this->service->save($source, $item, $request->validated(), $request->user());

        return response()->json([
            'message' => 'Pengkomunikasian pengendalian tersimpan.',
            'data' => new KomunikasiPengendalianResource($row),
        ]);
    }
}
