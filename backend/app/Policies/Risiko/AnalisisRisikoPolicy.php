<?php

declare(strict_types=1);

namespace App\Policies\Risiko;

use App\Models\User;

class AnalisisRisikoPolicy
{
    public function view(User $user, string $opdId): bool
    {
        if (! ($user->can('identifikasi_risiko_opd.view') || $user->can('identifikasi_risiko_opd_operasional.view') || $user->can('review_risiko.view') || $user->can('laporan.view'))) {
            return false;
        }
        if ($user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat'])) {
            return true;
        }
        if ($user->hasRole('Auditor')) {
            return $user->canReadOpdData($opdId);
        }

        return $user->opd_id && (string) $user->opd_id === $opdId;
    }

    public function edit(User $user, string $opdId, string $source): bool
    {
        $permission = $source === '3b' ? 'identifikasi_risiko_opd.edit' : 'identifikasi_risiko_opd_operasional.edit';

        return $user->can($permission) && $this->view($user, $opdId)
            && ($user->hasRole(['Superadmin', 'Admin Office']) || (string) $user->opd_id === $opdId);
    }
}
