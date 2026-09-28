<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OpdResource;
use App\Models\Opd;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpdController extends Controller
{
    /**
     * Get list of all OPDs.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Opd::query()->where('is_active', true);

        if ($request->has('kategori')) {
            $query->where('kategori', $request->query('kategori'));
        }

        if ($request->has('search')) {
            $term = trim((string) $request->query('search'));
            $query->where(function ($q) use ($term) {
                $q->where('nama', 'like', "%{$term}%")
                    ->orWhere('kode', 'like', "%{$term}%");
            });
        }

        $opds = $query->orderBy('nama', 'asc')->get();

        return response()->json([
            'data' => OpdResource::collection($opds),
        ]);
    }

    /**
     * Get a single OPD.
     */
    public function show(Opd $opd): JsonResponse
    {
        return response()->json([
            'data' => new OpdResource($opd),
        ]);
    }
}
