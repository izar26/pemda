<?php

declare(strict_types=1);

namespace App\Services\Setting;

use App\Models\SystemSetting;
use App\Models\User;
use App\Services\Audit\AuditLogService;
use Illuminate\Database\Eloquent\Collection;

class SystemSettingService
{
    public function __construct(
        protected AuditLogService $auditLogService
    ) {}

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

        foreach ($settings as $key => $value) {
            $setting = SystemSetting::where('key', $key)->first();
            if ($setting) {
                $setting->value = is_bool($value) ? ($value ? '1' : '0') : (string) $value;
                $setting->save();
                $updatedKeys[] = $setting->label ?? $key;
            }
        }

        // Record in audit log
        $this->auditLogService->log(
            action: 'SETTINGS_UPDATE',
            module: 'Pengaturan Sistem',
            description: "Memperbarui konfigurasi sistem: " . implode(', ', $updatedKeys),
            user: $user,
            context: ['updated_settings' => array_keys($settings)]
        );

        return $this->getAllSettings();
    }
}
