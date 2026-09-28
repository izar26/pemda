<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Setting\UpdateSystemSettingsRequest;
use App\Http\Resources\SystemSettingResource;
use App\Services\Setting\SystemSettingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SystemSettingController extends Controller
{
    public function __construct(
        protected SystemSettingService $settingService
    ) {}

    /**
     * Get all system settings.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        if (!$request->user()->can('settings.view')) {
            abort(403, 'Anda tidak memiliki hak akses untuk melihat pengaturan sistem.');
        }

        $settings = $this->settingService->getAllSettings();

        return SystemSettingResource::collection($settings);
    }

    /**
     * Update system settings.
     */
    public function update(UpdateSystemSettingsRequest $request): JsonResponse
    {
        $updatedSettings = $this->settingService->updateSettings(
            $request->validated('settings'),
            $request->user()
        );

        return response()->json([
            'message' => 'Pengaturan sistem portal berhasil diperbarui.',
            'data' => SystemSettingResource::collection($updatedSettings),
        ]);
    }
}
