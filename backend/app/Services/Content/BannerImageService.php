<?php

declare(strict_types=1);

namespace App\Services\Content;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Format;
use Intervention\Image\ImageManager;

class BannerImageService
{
    protected ImageManager $imageManager;

    public function __construct()
    {
        $this->imageManager = new ImageManager(new Driver());
    }

    /**
     * Process, compress to WebP, and store an uploaded banner image.
     *
     * @return array{
     *     path: string,
     *     size: int,
     *     width: int,
     *     height: int,
     *     mime: string,
     *     original_name: string
     * }
     */
    public function processAndStore(UploadedFile $file, string $placement = 'login'): array
    {
        // 1. Decode image from file
        $image = $this->imageManager->decodePath($file->getRealPath());

        // 2. Scale down if dimensions exceed 1920px (preserving aspect ratio)
        if ($image->width() > 1920 || $image->height() > 1920) {
            $image->scaleDown(width: 1920, height: 1920);
        }

        // 3. Compress to WebP format (quality 85)
        $encoded = $image->encodeUsingFormat(Format::WEBP, quality: 85);
        $encodedContent = (string) $encoded;

        // 4. Generate unique filename and storage path
        $filename = Str::uuid()->toString() . '.webp';
        $relativePath = "banners/{$placement}/{$filename}";

        // 5. Store to public disk
        Storage::disk('public')->put($relativePath, $encodedContent);

        return [
            'path' => $relativePath,
            'size' => strlen($encodedContent),
            'width' => $image->width(),
            'height' => $image->height(),
            'mime' => 'image/webp',
            'original_name' => $file->getClientOriginalName(),
        ];
    }

    /**
     * Delete an existing image file from storage if present.
     */
    public function delete(?string $path): bool
    {
        if (empty($path)) {
            return false;
        }

        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->delete($path);
        }

        return false;
    }
}
