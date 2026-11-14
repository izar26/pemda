<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Services\Risiko\Pengajuan\InvalidateDerivedFormsService;
use Illuminate\Database\Eloquent\Model;

trait InvalidatesDerivedRiskForms
{
    public static function bootInvalidatesDerivedRiskForms(): void
    {
        static::saved(function (Model $model) {
            if ($model->wasRecentlyCreated || count(array_diff(array_keys($model->getChanges()), ['updated_at'])) > 0) {
                app(InvalidateDerivedFormsService::class)->invalidate($model);
            }
        });
        static::deleting(fn (Model $model) => app(InvalidateDerivedFormsService::class)->invalidate($model, true));
    }
}
