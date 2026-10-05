<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;

trait HasUuid7
{
    use HasUuids;

    /**
     * Generate a new UUID v7 for the model.
     */
    public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }
}
