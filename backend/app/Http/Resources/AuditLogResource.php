<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\AuditLog;
use App\Models\AuditLogArchive;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AuditLog
 */
class AuditLogResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user_name' => $this->user_name,
            'user_nip' => $this->user_nip,
            'user_email' => $this->user_email,
            'action' => $this->action,
            'module' => $this->module,
            'auditable_type' => $this->auditable_type,
            'auditable_id' => $this->auditable_id,
            'description' => $this->description,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'context' => $this->context,
            'created_at' => $this->created_at?->toIso8601String(),
            $this->mergeWhen($this->resource instanceof AuditLogArchive, fn () => [
                'original_audit_id' => $this->original_audit_id,
                'archived_at' => $this->archived_at?->toIso8601String(),
                'archived_by' => $this->archived_by,
            ]),
        ];
    }
}
