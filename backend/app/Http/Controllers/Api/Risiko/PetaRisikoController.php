<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Risiko;

use App\Http\Controllers\Controller;
use App\Http\Requests\Risiko\PetaRisikoRequest;
use App\Services\Risiko\PetaRisikoService;
use Illuminate\Http\JsonResponse;

class PetaRisikoController extends Controller
{
    public function __construct(
        protected PetaRisikoService $service
    ) {}

    public function index(PetaRisikoRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $result = $this->service->generate(
            (string) $validated['opd_id'],
            (string) $validated['periode_penilaian_id'],
            $request->user(),
            $validated
        );

        return response()->json([
            'data' => $result,
        ]);
    }
}
