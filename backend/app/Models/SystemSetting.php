<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid7;
use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    use Auditable, HasFactory, HasUuid7;

    protected $fillable = [
        'key',
        'value',
        'group',
        'type',
        'label',
        'description',
    ];

    /**
     * Get typed setting value.
     */
    public function getTypedValueAttribute(): mixed
    {
        return match ($this->type) {
            'boolean' => filter_var($this->value, FILTER_VALIDATE_BOOLEAN),
            'integer' => (int) $this->value,
            'json' => json_decode($this->value ?? '[]', true),
            default => $this->value,
        };
    }

    /**
     * Get full URL for asset settings.
     */
    public function getAssetUrlAttribute(): ?string
    {
        if (empty($this->value) || !in_array($this->key, ['app_logo', 'app_favicon'], true)) {
            return null;
        }

        if (str_starts_with($this->value, 'http://') || str_starts_with($this->value, 'https://')) {
            return $this->value;
        }

        try {
            return \Illuminate\Support\Facades\Storage::disk('public')->url($this->value);
        } catch (\Throwable) {
            return null;
        }
    }
}
