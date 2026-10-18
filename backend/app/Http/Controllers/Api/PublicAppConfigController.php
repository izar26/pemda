<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Setting\SystemSettingService;
use Illuminate\Http\JsonResponse;

class PublicAppConfigController extends Controller
{
    public function __construct(
        protected SystemSettingService $settingService
    ) {}

    /**
     * Get public application identity and branding config.
     */
    public function index(): JsonResponse
    {
        try {
            $config = $this->settingService->getPublicAppConfig();

            return response()->json([
                'data' => $config,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('PublicAppConfigController@index failed: ' . $e->getMessage());

            return response()->json([
                'data' => [
                    'app_name' => 'Aplikasi ManRis',
                    'instance_name' => 'Pemerintah Daerah',
                    'app_logo_url' => null,
                    'app_favicon_url' => null,
                    'contact_email' => 'helpdesk@pemda.go.id',
                    'contact_phone' => '(021) 1234-5678',
                    'maintenance_mode' => false,
                ],
            ]);
        }
    }
}
