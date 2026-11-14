<?php

declare(strict_types=1);

namespace App\Contracts\Risiko;

use App\Models\Risiko\PengajuanPenilaianRisiko;
use App\Models\User;

interface RiskFormHandlerInterface
{
    /**
     * Unique lowercase form code, e.g. '2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6'.
     */
    public function getFormCode(): string;

    /**
     * Human-readable form title for readiness and logs.
     */
    public function getName(): string;

    /**
     * Ordering index for wizard sequencing.
     */
    public function getOrder(): int;

    /**
     * Check whether this form's data is complete and ready for submission.
     */
    public function isComplete(string $opdId, string $periodeId): bool;

    /**
     * Description explaining what is missing when incomplete.
     */
    public function getIncompleteMessage(): string;

    /**
     * Whether this form is mandatory for the given submission.
     */
    public function isRequired(PengajuanPenilaianRisiko $submission): bool;

    /**
     * Fetch formatted review data for auditor / pengawas review step.
     *
     * @param  array<string, mixed>  $params
     * @return array<string, mixed>
     */
    public function getReviewData(PengajuanPenilaianRisiko $submission, array $params, User $user): array;

    /**
     * Authorize user to view this form's data for the target OPD.
     */
    public function authorizeView(User $user, string $opdId): bool;

    /**
     * Authorize user to edit this form's data for the target OPD.
     */
    public function authorizeEdit(User $user, string $opdId): bool;

    /**
     * Form codes that depend on this form and should be invalidated if this form changes.
     *
     * @return array<int, string>
     */
    public function getDownstreamFormCodes(): array;
}
