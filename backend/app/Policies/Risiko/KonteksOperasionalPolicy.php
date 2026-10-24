<?php

declare(strict_types=1);

namespace App\Policies\Risiko;

use App\Models\Risiko\KonteksOperasional;
use App\Models\User;

class KonteksOperasionalPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('konteks_operasional.view')
            || $user->can('review_risiko.view')
            || $user->can('laporan.view')
            || $user->hasRole(['Auditor', 'Inspektorat', 'Superadmin', 'Admin Office']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, KonteksOperasional $konteks): bool
    {
        if ($user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat', 'Auditor', 'Bapperida', 'Executive'])) {
            return true;
        }

        if (!$user->can('konteks_operasional.view') && !$user->can('review_risiko.view') && !$user->can('laporan.view')) {
            return false;
        }

        return $konteks->opd_id === $user->opd_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->can('konteks_operasional.create');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, KonteksOperasional $konteks): bool
    {
        if (!$user->can('konteks_operasional.edit')) {
            return false;
        }

        if ($user->hasRole(['Superadmin', 'Admin Office'])) {
            return true;
        }

        return $konteks->opd_id === $user->opd_id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, KonteksOperasional $konteks): bool
    {
        if (!$user->can('konteks_operasional.delete')) {
            return false;
        }

        if ($user->hasRole(['Superadmin', 'Admin Office'])) {
            return true;
        }

        return $konteks->opd_id === $user->opd_id;
    }
}
