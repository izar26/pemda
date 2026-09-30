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
        }

        return $this->getAllSettings();
    }
}
