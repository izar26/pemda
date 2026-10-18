<?php

declare(strict_types=1);

namespace App\Services\Setting;

use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;

class SystemSettingService
{
    public const PUBLIC_CONFIG_CACHE_KEY = 'app_public_config';

    public function __construct(
        protected AuditLogService $auditLogService,
        protected SystemAssetService $assetService
    ) {}

    /**
     * Get public application configuration for unauthenticated clients (e.g. login page, header).
     *
     * @return array{
     *     app_name: string,
     *     instance_name: string,
     *     app_logo_url: ?string,
     *     app_favicon_url: ?string,
     *     contact_email: string,
     *     contact_phone: string,
     *     session_lifetime_minutes: int,
     *     max_login_attempts: int
     * }
     */
    public function getPublicAppConfig(): array
    {
        return Cache::remember(self::PUBLIC_CONFIG_CACHE_KEY, 86400, function () {
            $logoSetting = SystemSetting::where('key', 'app_logo')->first();
            $faviconSetting = SystemSetting::where('key', 'app_favicon')->first();

            return [
                'app_name' => SystemSetting::where('key', 'app_name')->value('value') ?? 'Aplikasi ManRis',
                'instance_name' => SystemSetting::where('key', 'instance_name')->value('value') ?? 'Pemerintah Daerah',
                'app_logo_url' => $logoSetting?->asset_url,
                'app_favicon_url' => $faviconSetting?->asset_url,
                'contact_email' => SystemSetting::where('key', 'contact_email')->value('value') ?? 'helpdesk@pemda.go.id',
                'contact_phone' => SystemSetting::where('key', 'contact_phone')->value('value') ?? '(021) 1234-5678',
                'session_lifetime_minutes' => (int) (SystemSetting::where('key', 'session_lifetime_minutes')->value('value') ?? 60),
                'max_login_attempts' => (int) (SystemSetting::where('key', 'max_login_attempts')->value('value') ?? 5),
            ];
        });
    }

    /**
     * Get all system settings.
     *
     * @return Collection<int, SystemSetting>
     */
    public function getAllSettings(): Collection
    {
        return SystemSetting::orderBy('group')->orderBy('id')->get();
    }

    /**
     * Update system settings.
     *
     * @param array<string, mixed> $settings
     */
    public function updateSettings(array $settings, User $user): Collection
    {
        $updatedKeys = [];
        $changes = [];

        foreach ($settings as $key => $value) {
            $setting = SystemSetting::where('key', $key)->first();
            if ($setting) {
                $oldValue = $setting->value;
                $newFormattedValue = is_bool($value) ? ($value ? '1' : '0') : (string) $value;

                if ($oldValue !== $newFormattedValue) {
                    $setting->value = $newFormattedValue;
                    SystemSetting::withoutAuditing(function () use ($setting) {
                        $setting->save();
                    });
                    $label = $setting->label ?? $key;
                    $updatedKeys[] = $label;
                    $changes[$label] = [
                        'old' => $oldValue,
                        'new' => $newFormattedValue,
                    ];
                }
            }
        }

        if (!empty($updatedKeys)) {
            $this->auditLogService->log(
                action: 'SETTINGS_UPDATE',
                module: 'Pengaturan Sistem',
                description: "Memperbarui konfigurasi sistem: " . implode(', ', $updatedKeys),
                user: $user,
                context: [
                    'action_type' => 'UPDATE',
                    'entity_name' => 'Pengaturan Sistem',
                    'record_title' => implode(', ', $updatedKeys),
                    'updated_settings' => array_keys($settings),
                    'changes' => $changes,
                ]
            );

            Cache::forget(self::PUBLIC_CONFIG_CACHE_KEY);
        }

        return $this->getAllSettings();
    }

    /**
     * Upload and store the official application logo.
     *
     * @return array{key: string, value: string, url: string}
     */
    public function uploadLogo(UploadedFile $file, User $user): array
    {
        $setting = SystemSetting::firstOrCreate(
            ['key' => 'app_logo'],
            [
                'group' => 'branding',
                'type' => 'string',
                'label' => 'Logo Resmi Aplikasi / Instansi',
                'description' => 'Logo resmi yang tampil pada header aplikasi, sidebar, dan portal login.',
            ]
        );

        $oldPath = $setting->value;
        $stored = $this->assetService->storeLogo($file);

        if (!empty($oldPath)) {
            $this->assetService->deleteAsset($oldPath);
        }

        $setting->value = $stored['path'];
        SystemSetting::withoutAuditing(function () use ($setting) {
            $setting->save();
        });

        $this->auditLogService->log(
            action: 'LOGO_UPDATE',
            module: 'Pengaturan Sistem',
            description: 'Memperbarui berkas logo resmi aplikasi: ' . $stored['original_name'],
            user: $user,
            context: [
                'action_type' => 'UPDATE',
                'entity_name' => 'Logo Aplikasi',
                'file_name' => $stored['original_name'],
                'mime' => $stored['mime'],
                'size' => $stored['size'],
            ]
        );

        Cache::forget(self::PUBLIC_CONFIG_CACHE_KEY);

        return [
            'key' => 'app_logo',
            'value' => $stored['path'],
            'url' => $stored['url'],
        ];
    }

    /**
     * Delete the official application logo (reset to default icon).
     */
    public function deleteLogo(User $user): void
    {
        $setting = SystemSetting::where('key', 'app_logo')->first();
        if ($setting && !empty($setting->value)) {
            $this->assetService->deleteAsset($setting->value);
            $setting->value = null;
            SystemSetting::withoutAuditing(function () use ($setting) {
                $setting->save();
            });

            $this->auditLogService->log(
                action: 'LOGO_DELETE',
                module: 'Pengaturan Sistem',
                description: 'Menghapus logo kustom aplikasi dan mengembalikan ke logo default.',
                user: $user,
                context: [
                    'action_type' => 'DELETE',
                    'entity_name' => 'Logo Aplikasi',
                ]
            );

            Cache::forget(self::PUBLIC_CONFIG_CACHE_KEY);
        }
    }
}
