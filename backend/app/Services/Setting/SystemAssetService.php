<?php

declare(strict_types=1);

namespace App\Services\Setting;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Format;
use Intervention\Image\ImageManager;

class SystemAssetService
{
    protected ImageManager $imageManager;

    public function __construct()
    {
        $this->imageManager = new ImageManager(new Driver());
    }

    /**
     * Store and optimize an uploaded application/instance logo.
     * Preserves alpha channel transparency for PNG, WebP, and sanitized SVG.
     *
     * @return array{
     *     path: string,
     *     url: string,
     *     mime: string,
     *     size: int,
     *     original_name: string
     * }
     */
    public function storeLogo(UploadedFile $file): array
    {
        $mime = $file->getMimeType() ?: 'image/png';
        $clientExt = strtolower($file->getClientOriginalExtension());
        $isSvg = str_contains($mime, 'svg') || $clientExt === 'svg';

        if ($isSvg) {
            // Process and sanitize SVG
            $content = (string) file_get_contents($file->getRealPath());
            $sanitized = $this->sanitizeSvg($content);

            $filename = 'logo-' . Str::uuid()->toString() . '.svg';
            $relativePath = "branding/{$filename}";
            Storage::disk('public')->put($relativePath, $sanitized);

            return [
                'path' => $relativePath,
                'url' => Storage::disk('public')->url($relativePath),
                'mime' => 'image/svg+xml',
                'size' => strlen($sanitized),
                'original_name' => $file->getClientOriginalName(),
            ];
        }

        // Process raster images (PNG, WebP, JPEG)
        $image = $this->imageManager->decodePath($file->getRealPath());

        // Constrain max dimensions to 512x512 while keeping aspect ratio
        if ($image->width() > 512 || $image->height() > 512) {
            $image->scaleDown(width: 512, height: 512);
        }

        // Keep PNG as PNG to retain exact vector-rasterized crispness and alpha transparency, or WebP
        if ($clientExt === 'png') {
            $encoded = $image->encodeUsingFormat(Format::PNG);
            $ext = 'png';
            $targetMime = 'image/png';
        } else {
            $encoded = $image->encodeUsingFormat(Format::WEBP, quality: 90);
            $ext = 'webp';
            $targetMime = 'image/webp';
        }

        $encodedContent = (string) $encoded;
        $filename = 'logo-' . Str::uuid()->toString() . '.' . $ext;
        $relativePath = "branding/{$filename}";

        Storage::disk('public')->put($relativePath, $encodedContent);

        return [
            'path' => $relativePath,
            'url' => Storage::disk('public')->url($relativePath),
            'mime' => $targetMime,
            'size' => strlen($encodedContent),
            'original_name' => $file->getClientOriginalName(),
        ];
    }

    /**
     * Delete an existing asset file from public disk.
     */
    public function deleteAsset(?string $path): bool
    {
        if (empty($path)) {
            return false;
        }

        if (Storage::disk('public')->exists($path)) {
            return Storage::disk('public')->delete($path);
        }

        return false;
    }

    /**
     * Sanitize SVG content against malicious scripts and XML external entities.
     */
    protected function sanitizeSvg(string $svg): string
    {
        // Remove XML DOCTYPE and external entity definitions
        $svg = preg_replace('/<!DOCTYPE.*?>/is', '', $svg) ?? $svg;
        $svg = preg_replace('/<!ENTITY.*?>/is', '', $svg) ?? $svg;

        // Remove <script> elements
        $svg = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $svg) ?? $svg;

        // Remove inline event handlers (onload, onclick, onerror, etc.)
        $svg = preg_replace('/\bon[a-z]+\s*=\s*(".*?"|\'.*?\'|[^\s>]+)/i', '', $svg) ?? $svg;

        // Remove javascript: pseudo-protocols in href or xlink:href
        $svg = preg_replace('/(href|xlink:href)\s*=\s*("javascript:[^"]*"|\'javascript:[^\']*\'|javascript:[^\s>]+)/i', '', $svg) ?? $svg;

        return trim($svg);
    }
}
