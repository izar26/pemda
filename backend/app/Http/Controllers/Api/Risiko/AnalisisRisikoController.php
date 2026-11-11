<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\CurrentAnalisisRisikoRequest;
use App\Http\Requests\Risiko\SaveAnalisisRisikoRequest;
use App\Http\Resources\Risiko\AnalisisRisikoResource;
use App\Services\Risiko\AnalisisRisikoService;
use Illuminate\Http\JsonResponse;

class AnalisisRisikoController extends Controller
{
    public function __construct(private readonly AnalisisRisikoService $service) {}

    public function index(CurrentAnalisisRisikoRequest $request): JsonResponse
    {
        $data = $request->validated();
        $result = $this->service->list($data['opd_id'], $data['periode_penilaian_id'], $request->user(), $data);

        return response()->json(['data' => AnalisisRisikoResource::collection($result['items']), 'meta' => [...$result['pagination'], 'sub_unsur_spip' => $result['sub_unsur_spip']]]);
    }

    public function save(SaveAnalisisRisikoRequest $request, string $source, string $item): JsonResponse
    {
        $analysis = $this->service->save($source, $item, $request->validated(), $request->user());

        return response()->json(['data' => $analysis]);
    }
}
