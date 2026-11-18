<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add per-item current_tier to enable independent live per-form
     * approval and strict waterfall revision tracking without blocking reviewers.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('pengajuan_penilaian_risiko_items', 'current_tier')) {
            Schema::table('pengajuan_penilaian_risiko_items', function (Blueprint $table) {
                $table->string('current_tier', 30)->default('operator')->after('form_code');
                $table->index(['pengajuan_id', 'current_tier'], 'pengajuan_items_tier_idx');
            });
        }

        // Backfill existing items cleanly from parent submission state and per-tier item statuses
        $submissions = DB::table('pengajuan_penilaian_risikos')->get(['id', 'current_tier', 'status']);
        foreach ($submissions as $sub) {
            $parentTier = $sub->current_tier ?: 'operator';
            $parentStatus = $sub->status ?: 'draft';

            $items = DB::table('pengajuan_penilaian_risiko_items')
                ->where('pengajuan_id', $sub->id)
                ->get(['id', 'status', 'status_kepala_opd', 'status_auditor', 'status_pengawas']);

            foreach ($items as $item) {
                $itemTier = $parentTier;

                if ($parentStatus === 'approved' || $parentTier === 'completed') {
                    $itemTier = 'completed';
                } elseif ($parentStatus === 'draft') {
                    $itemTier = 'operator';
                } elseif ($item->status_kepala_opd === 'rejected' || $parentStatus === 'revision_by_kepala_opd' || $parentStatus === 'revision_to_operator') {
                    $itemTier = $item->status === 'rejected' ? 'operator' : $parentTier;
                } elseif ($item->status_auditor === 'rejected' || $parentStatus === 'revision_by_auditor') {
                    $itemTier = $item->status_auditor === 'rejected' ? 'kepala_opd' : $parentTier;
                } elseif ($item->status_pengawas === 'rejected' || $parentStatus === 'revision_by_pengawas') {
                    $itemTier = $item->status_pengawas === 'rejected' ? 'auditor' : $parentTier;
                }

                DB::table('pengajuan_penilaian_risiko_items')
                    ->where('id', $item->id)
                    ->update(['current_tier' => $itemTier]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('pengajuan_penilaian_risiko_items', 'current_tier')) {
            Schema::table('pengajuan_penilaian_risiko_items', function (Blueprint $table) {
                $table->dropIndex('pengajuan_items_tier_idx');
                $table->dropColumn('current_tier');
            });
        }
    }
};
