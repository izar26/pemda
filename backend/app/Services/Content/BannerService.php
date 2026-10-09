<?php

declare(strict_types=1);

namespace App\Services\Content;

use App\Models\Banner;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class BannerService
{
    public function __construct(
        protected BannerImageService $imageService
    ) {}

    /**
     * Get active banners for public display (e.g. login carousel or homepage).
     *
     * @return Collection<int, Banner>
     */
    public function getPublicBanners(string $placement = 'login'): Collection
    {
        return Banner::query()
            ->placement($placement)
            ->active()
            ->ordered()
            ->get();
    }

    /**
     * Get paginated or filtered banners for admin panel.
     */
    public function getBanners(array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = Banner::query()->with('creator:id,name,email');

        if (!empty($filters['placement'])) {
            $query->placement($filters['placement']);
        }

        if (isset($filters['is_active']) && $filters['is_active'] !== '') {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['search'])) {
            $search = '%' . $filters['search'] . '%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                  ->orWhere('description', 'like', $search);
            });
        }

        return $query->ordered()->paginate($perPage);
    }

    /**
     * Create a new banner with compressed WebP image.
     */
    public function createBanner(array $data, UploadedFile $file, ?User $creator = null): Banner
    {
        return DB::transaction(function () use ($data, $file, $creator) {
            $placement = $data['placement'] ?? 'login';

            // Auto-assign next order number if not specified
            if (!isset($data['order'])) {
                $maxOrder = Banner::where('placement', $placement)->max('order') ?? 0;
                $data['order'] = $maxOrder + 1;
            }

            // Process & compress image
            $processed = $this->imageService->processAndStore($file, $placement);

            return Banner::create([
                'title' => $data['title'] ?? null,
                'description' => $data['description'] ?? null,
                'placement' => $placement,
                'image_path' => $processed['path'],
                'order' => (int) $data['order'],
                'is_active' => isset($data['is_active']) ? (bool) $data['is_active'] : true,
                'meta' => [
                    'size' => $processed['size'],
                    'width' => $processed['width'],
                    'height' => $processed['height'],
                    'original_name' => $processed['original_name'],
                    'mime' => $processed['mime'],
                ],
                'created_by' => $creator?->id,
            ]);
        });
    }

    /**
     * Update an existing banner, optionally replacing the image.
     */
    public function updateBanner(Banner $banner, array $data, ?UploadedFile $file = null): Banner
    {
        return DB::transaction(function () use ($banner, $data, $file) {
            $placement = $data['placement'] ?? $banner->placement;

            $updateData = [
                'title' => array_key_exists('title', $data) ? $data['title'] : $banner->title,
                'description' => array_key_exists('description', $data) ? $data['description'] : $banner->description,
                'placement' => $placement,
                'order' => isset($data['order']) ? (int) $data['order'] : $banner->order,
                'is_active' => isset($data['is_active']) ? (bool) $data['is_active'] : $banner->is_active,
            ];

            if ($file !== null) {
                // Remove old image
                $this->imageService->delete($banner->image_path);

                // Process new image
                $processed = $this->imageService->processAndStore($file, $placement);
                $updateData['image_path'] = $processed['path'];
                $updateData['meta'] = [
                    'size' => $processed['size'],
                    'width' => $processed['width'],
                    'height' => $processed['height'],
                    'original_name' => $processed['original_name'],
                    'mime' => $processed['mime'],
                ];
            }

            $banner->update($updateData);

            return $banner->fresh();
        });
    }

    /**
     * Toggle active status of a banner.
     */
    public function toggleActive(Banner $banner): Banner
    {
        $banner->update([
            'is_active' => !$banner->is_active,
        ]);

        return $banner;
    }

    /**
     * Reorder banners based on an array of IDs in order.
     *
     * @param list<string> $orderedIds
     */
    public function reorderBanners(array $orderedIds): void
    {
        DB::transaction(function () use ($orderedIds) {
            foreach ($orderedIds as $index => $id) {
                Banner::where('id', $id)->update(['order' => $index + 1]);
            }
        });
    }

    /**
     * Delete a banner and its associated image file.
     */
    public function deleteBanner(Banner $banner): bool
    {
        return DB::transaction(function () use ($banner) {
            $this->imageService->delete($banner->image_path);
            return (bool) $banner->delete();
        });
    }
}
