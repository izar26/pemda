<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Content;

use App\Http\Controllers\Controller;
use App\Http\Requests\Content\ReorderBannerRequest;
use App\Http\Requests\Content\StoreBannerRequest;
use App\Http\Requests\Content\UpdateBannerRequest;
use App\Http\Resources\BannerResource;
use App\Models\Banner;
use App\Services\Content\BannerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BannerController extends Controller
{
    public function __construct(
        protected BannerService $bannerService
    ) {}

    /**
     * Display a listing of banners with filters and pagination.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        if (!$request->user()->can('content.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat konten banner.');
        }

        $filters = $request->only(['placement', 'is_active', 'search']);
        $perPage = (int) $request->query('per_page', 20);

        $banners = $this->bannerService->getBanners($filters, $perPage);

        return BannerResource::collection($banners);
    }

    /**
     * Store a newly created banner.
     */
    public function store(StoreBannerRequest $request): JsonResponse
    {
        $banner = $this->bannerService->createBanner(
            $request->validated(),
            $request->file('image'),
            $request->user()
        );

        return response()->json([
            'message' => 'Banner berhasil ditambahkan dan dioptimasi.',
            'data' => new BannerResource($banner),
        ], 201);
    }

    /**
     * Display the specified banner.
     */
    public function show(Request $request, Banner $banner): BannerResource
    {
        if (!$request->user()->can('content.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat konten banner.');
        }

        $banner->load('creator');

        return new BannerResource($banner);
    }

    /**
     * Update the specified banner.
     */
    public function update(UpdateBannerRequest $request, Banner $banner): JsonResponse
    {
        $updatedBanner = $this->bannerService->updateBanner(
            $banner,
            $request->validated(),
            $request->file('image')
        );

        return response()->json([
            'message' => 'Banner berhasil diperbarui.',
            'data' => new BannerResource($updatedBanner),
        ]);
    }

    /**
     * Toggle the active status of the banner.
     */
    public function toggleActive(Request $request, Banner $banner): JsonResponse
    {
        if (!$request->user()->can('content.manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengubah status banner.');
        }

        $banner = $this->bannerService->toggleActive($banner);

        return response()->json([
            'message' => 'Status banner berhasil diubah.',
            'data' => new BannerResource($banner),
        ]);
    }

    /**
     * Reorder banners.
     */
    public function reorder(ReorderBannerRequest $request): JsonResponse
    {
        $this->bannerService->reorderBanners($request->validated('banner_ids'));

        return response()->json([
            'message' => 'Urutan banner berhasil diperbarui.',
        ]);
    }

    /**
     * Remove the specified banner.
     */
    public function destroy(Request $request, Banner $banner): JsonResponse
    {
        if (!$request->user()->can('content.manage')) {
            abort(403, 'Anda tidak memiliki hak akses untuk menghapus banner.');
        }

        $this->bannerService->deleteBanner($banner);

        return response()->json([
            'message' => 'Banner berhasil dihapus.',
        ]);
    }
}
