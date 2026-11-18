<?php

declare(strict_types=1);

namespace App\Policies\Risiko;

use App\Models\Pengawasan\AuditorOpdAssignment;
use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;

class PengajuanPenilaianRisikoPolicy
{
    public function view(User $user, PengajuanPenilaianRisiko $submission): bool
    {
        if (! $user->can('review_risiko.view') || ! $user->canAccessReviewRisiko()) {
            return false;
        }

        if ($user->isRegionalAdmin()) {
            return true;
        }

        if ($user->isScopedPengawas()) {
            return AuditorOpdAssignment::where('opd_id', $submission->opd_id)
                ->where('assigned_by', $user->id)
                ->where('is_active', true)
                ->exists();
        }

        if ($user->isScopedAuditor()) {
            return (string) $submission->auditor_id === (string) $user->id
                || AuditorOpdAssignment::where('auditor_id', $user->id)
                    ->where('opd_id', $submission->opd_id)
                    ->where('is_active', true)
                    ->exists();
        }

        if ($user->isKepalaOpd()) {
            return (string) $user->opd_id === (string) $submission->opd_id;
        }

        return false;
    }
}
