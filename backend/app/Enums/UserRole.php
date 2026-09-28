<?php

declare(strict_types=1);

namespace App\Enums;

enum UserRole: string
{
    case SUPERADMIN = 'superadmin';
    case ADMIN_OPD = 'admin_opd';
    case VERIFIKATOR = 'verifikator';
    case STAFF = 'staff';

    public function label(): string
    {
        return match ($this) {
            self::SUPERADMIN => 'Super Administrator',
            self::ADMIN_OPD => 'Admin OPD',
            self::VERIFIKATOR => 'Verifikator',
            self::STAFF => 'Staff Pelaksana',
        };
    }
}
