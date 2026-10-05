<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasUuid7;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AuditLogArchive extends Model
{
    use HasFactory, HasUuid7;

    public $timestamps = false;

    protected $fillable = [
        'original_audit_id',
        'user_id',
        'user_name',
        'user_nip',
        'user_email',
        'action',
        'module',
        'auditable_type',
        'auditable_id',
        'description',
        'ip_address',
        'user_agent',
        'context',
        'created_at',
        'archived_at',
        'archived_by',
    ];

    protected function casts(): array
    {
        return [
            'original_audit_id' => 'string',
            'auditable_id' => 'string',
            'context' => 'array',
            'created_at' => 'datetime',
            'archived_at' => 'datetime',
        ];
    }

    /**
     * Application-level immutability guard.
     * Records in the archive vault are strictly permanent and cannot be modified or deleted.
     */
    protected static function booted(): void
    {
        static::updating(function () {
            throw new \LogicException('Catatan kubah arsip audit log bersifat permanen dan tidak dapat diubah.');
        });

        static::deleting(function () {
            throw new \LogicException('Catatan kubah arsip audit log bersifat permanen dan tidak dapat dihapus oleh siapapun.');
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function archivedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

    public function auditable(): MorphTo
    {
        return $this->morphTo();
    }
}
