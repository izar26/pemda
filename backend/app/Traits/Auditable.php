<?php

declare(strict_types=1);

namespace App\Traits;

use App\Services\Audit\AuditDiffHelper;
use App\Services\Audit\AuditLogService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * Trait Auditable
 *
 * Automatically records CREATE, UPDATE, DELETE, and RESTORE events on Eloquent models
 * with before-and-after diffs, sensitive attribute masking, and zero-change suppression.
 */
trait Auditable
{
    /**
     * Cache for original values before update.
     *
     * @var array<string, mixed>
     */
    public array $auditPreUpdateOriginals = [];

    /**
     * Global switch to temporarily disable auditing on this model class (e.g. for seeders).
     */
    public static bool $auditDisabled = false;

    /**
     * Boot the auditable trait for the model.
     */
    public static function bootAuditable(): void
    {
        // 1. Hook CREATED event
        static::created(function (Model $model) {
            if (static::$auditDisabled || !$model->shouldAuditEvent('created')) {
                return;
            }

            self::dispatchAudit(function () use ($model) {
                $snapshot = AuditDiffHelper::extractSnapshot($model, $model->getAuditExclude());
                app(AuditLogService::class)->logModelEvent(
                    model: $model,
                    event: 'created',
                    eventData: ['attributes' => $snapshot]
                );
            });
        });

        // 2. Hook UPDATING event to reliably snapshot old values
        static::updating(function (Model $model) {
            if (static::$auditDisabled || !$model->shouldAuditEvent('updated')) {
                return;
            }

            $dirtyKeys = array_keys($model->getDirty());
            $originals = [];
            foreach ($dirtyKeys as $key) {
                $originals[$key] = $model->getOriginal($key);
            }
            $model->auditPreUpdateOriginals = $originals;
        });

        // 3. Hook UPDATED event
        static::updated(function (Model $model) {
            if (static::$auditDisabled || !$model->shouldAuditEvent('updated')) {
                return;
            }

            $rawChanges = $model->getChanges();
            $preOriginals = $model->auditPreUpdateOriginals ?? [];
            $ignored = array_merge(['updated_at'], $model->getAuditExclude());

            $changes = [];
            foreach ($rawChanges as $attribute => $newValue) {
                if (in_array($attribute, $ignored, true)) {
                    continue;
                }

                $oldValue = $preOriginals[$attribute] ?? $model->getOriginal($attribute);

                $isSensitive = AuditDiffHelper::isSensitiveField($attribute);

                $changes[$attribute] = [
                    'old' => $isSensitive ? '***REDACTED***' : $oldValue,
                    'new' => $isSensitive ? '***REDACTED***' : $newValue,
                ];
            }

            // Zero-change suppression: if no meaningful attributes changed, do not log
            if (empty($changes)) {
                return;
            }

            self::dispatchAudit(function () use ($model, $changes) {
                app(AuditLogService::class)->logModelEvent(
                    model: $model,
                    event: 'updated',
                    eventData: ['changes' => $changes]
                );
            });
        });

        // 4. Hook DELETED event
        static::deleted(function (Model $model) {
            if (static::$auditDisabled || !$model->shouldAuditEvent('deleted')) {
                return;
            }

            // Extract snapshot before model is gone
            $snapshot = AuditDiffHelper::extractSnapshot($model, $model->getAuditExclude());

            self::dispatchAudit(function () use ($model, $snapshot) {
                app(AuditLogService::class)->logModelEvent(
                    model: $model,
                    event: 'deleted',
                    eventData: ['snapshot' => $snapshot]
                );
            });
        });

        // 5. Hook RESTORED event (for SoftDeletes if used)
        if (method_exists(static::class, 'restored')) {
            static::restored(function (Model $model) {
                if (static::$auditDisabled || !$model->shouldAuditEvent('restored')) {
                    return;
                }

                self::dispatchAudit(function () use ($model) {
                    $snapshot = AuditDiffHelper::extractSnapshot($model, $model->getAuditExclude());
                    app(AuditLogService::class)->logModelEvent(
                        model: $model,
                        event: 'restored',
                        eventData: ['snapshot' => $snapshot]
                    );
                });
            });
        }
    }

    /**
     * Dispatch the audit logging callback either after DB transaction commits or immediately.
     */
    protected static function dispatchAudit(callable $callback): void
    {
        try {
            if (DB::transactionLevel() > 0) {
                DB::afterCommit($callback);
            } else {
                $callback();
            }
        } catch (\Throwable $e) {
            // Safeguard: audit logging failures should report to log but not crash the user transaction
            report($e);
        }
    }

    /**
     * Temporarily disable auditing for a callback.
     */
    public static function withoutAuditing(callable $callback): mixed
    {
        $previous = static::$auditDisabled;
        static::$auditDisabled = true;

        try {
            return $callback();
        } finally {
            static::$auditDisabled = $previous;
        }
    }

    /**
     * Determine if a given event should be audited for this model.
     */
    public function shouldAuditEvent(string $event): bool
    {
        $events = property_exists($this, 'auditEvents') && is_array($this->auditEvents)
            ? $this->auditEvents
            : ['created', 'updated', 'deleted', 'restored'];

        return in_array($event, $events, true);
    }

    /**
     * Get model-specific excluded attributes.
     *
     * @return array<string>
     */
    public function getAuditExclude(): array
    {
        return property_exists($this, 'auditExclude') && is_array($this->auditExclude)
            ? $this->auditExclude
            : [];
    }
}
