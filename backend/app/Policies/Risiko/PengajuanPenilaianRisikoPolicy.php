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
        if (! $user->can('review_risiko.view')) {
            return false;
        }
        if ($user->isRegionalAdmin() || $user->hasRole('Koordinator Pengawas') || $user->can('review_risiko.review_pengawas')) {
            return true;
        }
        if ($user->can('review_risiko.review_kepala') || $user->hasRole('Executive')) {
            return $user->opd_id && (string) $user->opd_id === (string) $submission->opd_id;
        }
        if ($user->can('review_risiko.approve') || $user->hasRole('Auditor')) {
            return (string) $submission->auditor_id === (string) $user->id || AuditorOpdAssignment::where('auditor_id', $user->id)
                ->where('opd_id', $submission->opd_id)->where('is_active', true)->exists();
        }

        return false;
    }
}
