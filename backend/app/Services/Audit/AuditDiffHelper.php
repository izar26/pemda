<?php

declare(strict_types=1);

namespace App\Services\Audit;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class AuditDiffHelper
{
    /**
     * Default list of sensitive attribute keys that must never be recorded in plain text.
     *
     * @var array<string>
     */
    protected const SENSITIVE_FIELDS = [
        'password',
        'password_confirmation',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'activation_token',
        'token',
        'secret',
        'api_key',
        'access_token',
        'refresh_token',
        'private_key',
    ];

    /**
     * Attributes that are ignored during change detection to prevent noisy false logs.
     *
     * @var array<string>
     */
    protected const IGNORED_FIELDS = [
        'updated_at',
        'remember_token',
    ];

    /**
     * Extract modified attributes between original state and current state.
     *
     * @param  array<string, mixed>  $customIgnored
     * @return array<string, array{old: mixed, new: mixed}>
     */
    public static function extractChanges(Model $model, array $customIgnored = []): array
    {
        $changes = [];
        $rawChanges = $model->getChanges();
        $ignored = array_merge(self::IGNORED_FIELDS, $customIgnored);

        foreach ($rawChanges as $attribute => $newValue) {
            if (in_array($attribute, $ignored, true)) {
                continue;
            }

            $oldValue = $model->getOriginal($attribute);

            // Avoid false positives due to type casting differences
            if (self::areValuesEquivalent($oldValue, $newValue)) {
                continue;
            }

            $isSensitive = self::isSensitiveField($attribute);

            $changes[$attribute] = [
                'old' => $isSensitive ? '***REDACTED***' : self::sanitizeValue($oldValue),
                'new' => $isSensitive ? '***REDACTED***' : self::sanitizeValue($newValue),
            ];
        }

        return $changes;
    }

    /**
     * Create a sanitized snapshot of a model's attributes.
     *
     * @param  array<string, mixed>  $customExcluded
     * @return array<string, mixed>
     */
    public static function extractSnapshot(Model $model, array $customExcluded = []): array
    {
        $attributes = $model->getAttributes();
        $hidden = $model->getHidden();
        $excluded = array_merge(self::IGNORED_FIELDS, $hidden, $customExcluded);

        $snapshot = [];
        foreach ($attributes as $key => $value) {
            if (in_array($key, $excluded, true)) {
                continue;
            }

            if (self::isSensitiveField($key)) {
                $snapshot[$key] = '***REDACTED***';
                continue;
            }

            $snapshot[$key] = self::sanitizeValue($value);
        }

        return $snapshot;
    }

    /**
     * Check if an attribute name matches sensitive keyword patterns.
     */
    public static function isSensitiveField(string $attribute): bool
    {
        $attributeLower = strtolower($attribute);

        foreach (self::SENSITIVE_FIELDS as $pattern) {
            if ($attributeLower === $pattern || Str::contains($attributeLower, [$pattern, 'secret', 'token', 'password'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Resolve a user-friendly label/title for a given model instance.
     */
    public static function resolveEntityLabel(Model $model): string
    {
        $candidates = [
            'name', 'nama', 'title', 'judul', 'label', 'email', 'code', 'kode',
            'periode_penilaian', 'periode', 'tujuan', 'sasaran', 'indikator',
            'nama_program', 'nama_kegiatan', 'nama_sub_kegiatan',
            'pernyataan_konteks', 'isu_strategis',
        ];

        foreach ($candidates as $attribute) {
            $val = $model->getAttribute($attribute);
            if (!empty($val) && is_scalar($val)) {
                return (string) $val;
            }
        }

        if ($model instanceof \App\Models\Perencanaan\KonteksRisikoStrategis) {
            return 'Konteks Risiko OPD #' . ($model->opd_id ?? $model->getKey());
        }

        return class_basename($model) . ' #' . $model->getKey();
    }

    /**
     * Resolve a clean module category name from a model instance.
     */
    public static function resolveModule(Model $model): string
    {
        if (property_exists($model, 'auditModule') && is_string($model->auditModule)) {
            return $model->auditModule;
        }

        $className = get_class($model);

        if (Str::startsWith($className, 'App\\Models\\Perencanaan\\')) {
            return 'Perencanaan Kinerja';
        }

        if (Str::startsWith($className, 'App\\Models\\Master\\')) {
            return 'Master Data';
        }

        return match ($className) {
            'App\\Models\\User' => 'Pegawai',
            'App\\Models\\Opd' => 'Organisasi (OPD)',
            'App\\Models\\SystemSetting' => 'Pengaturan Sistem',
            'App\\Models\\Role' => 'Peran & Izin',
            'App\\Models\\Permission' => 'Peran & Izin',
            default => class_basename($model),
        };
    }

    /**
     * Determine if two values are practically equivalent to avoid false diff entries.
     */
    protected static function areValuesEquivalent(mixed $a, mixed $b): bool
    {
        if ($a === $b) {
            return true;
        }

        // Handle numeric equivalents e.g. "10" and 10
        if (is_numeric($a) && is_numeric($b) && (string) $a === (string) $b) {
            return true;
        }

        // Handle datetime comparisons
        if (($a instanceof Carbon || is_string($a)) && ($b instanceof Carbon || is_string($b))) {
            try {
                $timeA = Carbon::parse($a)->toIso8601String();
                $timeB = Carbon::parse($b)->toIso8601String();
                return $timeA === $timeB;
            } catch (\Throwable) {
                // fall through
            }
        }

        return false;
    }

    /**
     * Sanitize value to avoid memory leaks or excessive column storage sizes.
     */
    protected static function sanitizeValue(mixed $value): mixed
    {
        if (is_null($value) || is_bool($value) || is_int($value) || is_float($value)) {
            return $value;
        }

        if (is_array($value)) {
            return array_map([self::class, 'sanitizeValue'], $value);
        }

        if (is_string($value)) {
            // Trim and truncate excessively huge strings (like base64 or long dumps)
            $trimmed = trim($value);
            if (strlen($trimmed) > 3000) {
                return mb_substr($trimmed, 0, 3000) . '... [TRUNCATED]';
            }
            return $trimmed;
        }

        if ($value instanceof Carbon) {
            return $value->toIso8601String();
        }

        if (is_object($value)) {
            if (method_exists($value, '__toString')) {
                return (string) $value;
            }
            return get_class($value);
        }

        return $value;
    }
}
