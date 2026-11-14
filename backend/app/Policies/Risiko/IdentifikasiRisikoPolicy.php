<?php

declare(strict_types=1);

namespace App\Policies\Risiko;

use App\Models\User;

class IdentifikasiRisikoPolicy
{
    /**
     * Map form code to required view permission.
     */
    public const VIEW_PERMISSIONS = [
        '3a' => 'identifikasi_risiko_pemda.view',
        '3b' => 'identifikasi_risiko_opd.view',
        '3c' => 'identifikasi_risiko_opd_operasional.view',
        'rca' => 'rca.view',
    ];

    /**
     * Map form code to required edit permission.
     */
    public const EDIT_PERMISSIONS = [
        '3a' => 'identifikasi_risiko_pemda.edit',
        '3b' => 'identifikasi_risiko_opd.edit',
        '3c' => 'identifikasi_risiko_opd_operasional.edit',
        'rca' => 'rca.edit',
    ];

    /**
     * Map form code to required delete permission.
     */
    public const DELETE_PERMISSIONS = [
        '3a' => 'identifikasi_risiko_pemda.delete',
        '3b' => 'identifikasi_risiko_opd.delete',
        '3c' => 'identifikasi_risiko_opd_operasional.delete',
        'rca' => 'rca.edit',
    ];

    /**
     * Check if user can view risk identification documents of an OPD.
     */
    public function view(User $user, string $opdId, string $form = '3a'): bool
    {
        $perm = self::VIEW_PERMISSIONS[$form] ?? 'identifikasi_risiko_pemda.view';
        $hasGeneralView = $user->can($perm)
            || $user->can('review_risiko.view')
            || $user->can('laporan.view');

        if (! $hasGeneralView && ! $user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat', 'Auditor'])) {
            return false;
        }

        if ($user->hasRole(['Superadmin', 'Admin Office', 'Inspektorat'])) {
            return true;
        }

        if ($user->isScopedAuditor()) {
            return $user->canReadOpdData($opdId);
        }

        if ($user->hasRole('OPD') || $user->hasRole('Executive')) {
            return $user->opd_id && (string) $user->opd_id === (string) $opdId;
        }

        return (string) $user->opd_id === (string) $opdId;
    }

    /**
     * Check if user can create or edit risk identification items for an OPD.
     */
    public function edit(User $user, string $opdId, string $form = '3a'): bool
    {
        if ($user->hasRole(['Superadmin', 'Admin Office'])) {
            return true;
        }

        $perm = self::EDIT_PERMISSIONS[$form] ?? 'identifikasi_risiko_pemda.edit';
        $createPerm = str_replace('.edit', '.create', $perm);

        $hasPerm = $user->can($perm) || $user->can($createPerm);

        // For RCA, also allow if user has permission to edit the source risk forms (3A, 3B, 3C)
        if ($form === 'rca' && ! $hasPerm) {
            $hasPerm = $user->can('identifikasi_risiko_pemda.edit')
                || $user->can('identifikasi_risiko_opd.edit')
                || $user->can('identifikasi_risiko_opd_operasional.edit');
        }

        if (! $hasPerm) {
            return false;
        }

        // Must strictly belong to the same OPD
        return $user->opd_id && (string) $user->opd_id === (string) $opdId;
    }

    /**
     * Check if user can delete risk identification items for an OPD.
     */
    public function delete(User $user, string $opdId, string $form = '3a'): bool
    {
        if ($user->hasRole(['Superadmin', 'Admin Office'])) {
            return true;
        }

        $perm = self::DELETE_PERMISSIONS[$form] ?? 'identifikasi_risiko_pemda.delete';
        $editPerm = str_replace('.delete', '.edit', $perm);

        $hasPerm = $user->can($perm) || $user->can($editPerm);
        if (! $hasPerm) {
            return false;
        }

        return $user->opd_id && (string) $user->opd_id === (string) $opdId;
    }
}
