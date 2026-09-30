<?php

declare(strict_types=1);

namespace App\Models;

use App\Traits\Auditable;
use Spatie\Permission\Models\Permission as SpatiePermission;

class Permission extends SpatiePermission
{
    use Auditable;
    protected $fillable = [
        'name',
        'guard_name',
        'group',
        'description',
    ];
}
