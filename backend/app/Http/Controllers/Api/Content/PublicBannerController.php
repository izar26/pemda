<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Content;

use App\Http\Controllers\Controller;
use App\Http\Resources\BannerResource;
use App\Services\Content\BannerService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicBannerController extends Controller
{
    public function __construct(
        protected BannerService $bannerService
    ) {}

    /**
     * Get active banners for public display (e.g. login page, public portal).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $placement = $request->query('placement', 'login');
        $banners = $this->bannerService->getPublicBanners((string) $placement);

        return BannerResource::collection($banners);
    }
}
