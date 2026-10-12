<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Content;

use App\Http\Controllers\Controller;
use App\Http\Resources\BannerResource;
use App\Services\Content\BannerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Log;

class PublicBannerController extends Controller
{
    public function __construct(
        protected BannerService $bannerService
    ) {}

    /**
     * Get active banners for public display (e.g. login page, public portal).
     */
    public function index(Request $request): JsonResponse|AnonymousResourceCollection
    {
        try {
            $placement = $request->query('placement', 'login');
            $banners = $this->bannerService->getPublicBanners((string) $placement);

            return BannerResource::collection($banners);
        } catch (\Throwable $e) {
            Log::warning('PublicBannerController@index failed: ' . $e->getMessage());

            return response()->json([
                'data' => [],
            ]);
        }
    }
}
