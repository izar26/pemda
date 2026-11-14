<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\CurrentAnalisisRisikoRequest;
use App\Http\Requests\Risiko\SavePemantauanPengendalianRequest;
use App\Http\Resources\Risiko\PemantauanPengendalianResource;
use App\Services\Risiko\PemantauanPengendalianService;
use Illuminate\Http\JsonResponse;

class PemantauanPengendalianController extends Controller
{
    public function __construct(private readonly PemantauanPengendalianService $service) {}

    public function index(CurrentAnalisisRisikoRequest $request): JsonResponse
    {
        $data = $request->validated();
        $result = $this->service->list($data['opd_id'], $data['periode_penilaian_id'], $request->user(), $data);

        return response()->json([
            'data' => PemantauanPengendalianResource::collection($result['items']),
            'meta' => $result['pagination'],
        ]);
    }

    public function save(SavePemantauanPengendalianRequest $request, string $source, string $item): JsonResponse
    {
        $row = $this->service->save($source, $item, $request->validated(), $request->user());

        return response()->json([
            'message' => 'Rancangan pemantauan pengendalian intern tersimpan.',
            'data' => new PemantauanPengendalianResource($row),
        ]);
    }
}
