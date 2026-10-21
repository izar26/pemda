<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Main Risk Submission Table
        Schema::create('pengajuan_penilaian_risikos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('opd_id');
            $table->uuid('periode_penilaian_id');
            $table->uuid('auditor_id')->nullable();

            // Status: draft, submitted, in_review, revision_requested, approved
            $table->string('status', 30)->default('draft');

            $table->timestamp('submitted_at')->nullable();
            $table->uuid('submitted_by')->nullable();

            $table->timestamp('approved_at')->nullable();
            $table->uuid('approved_by')->nullable();

            $table->text('catatan_umum')->nullable();
            $table->timestamps();

            // Constraints & Foreign Keys
            $table->unique(['opd_id', 'periode_penilaian_id'], 'uq_pengajuan_opd_periode');

            $table->foreign('opd_id')
                ->references('id')
                ->on('opds')
                ->cascadeOnDelete();

            $table->foreign('periode_penilaian_id')
                ->references('id')
                ->on('periode_penilaians')
                ->cascadeOnDelete();

            $table->foreign('auditor_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->foreign('submitted_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->foreign('approved_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->index(['opd_id', 'status']);
            $table->index(['auditor_id', 'status']);
        });

        // 2. Per-form review items (e.g. Form 2B, Form 2C, etc.)
        Schema::create('pengajuan_penilaian_risiko_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('pengajuan_id');
            $table->string('form_code', 20); // e.g. '2b', '2c'

            // Status: draft, submitted, approved, rejected
            $table->string('status', 30)->default('draft');
            $table->text('catatan_revisi')->nullable();

            $table->timestamp('reviewed_at')->nullable();
            $table->uuid('reviewed_by')->nullable();
            $table->timestamps();

            $table->unique(['pengajuan_id', 'form_code'], 'uq_pengajuan_item_form');

            $table->foreign('pengajuan_id')
                ->references('id')
                ->on('pengajuan_penilaian_risikos')
                ->cascadeOnDelete();

            $table->foreign('reviewed_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->index(['pengajuan_id', 'status']);
        });

        // 3. Review & Workflow History Timeline
        Schema::create('pengajuan_penilaian_risiko_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('pengajuan_id');
            $table->string('form_code', 20)->nullable(); // null if general submission action
            $table->string('action', 50); // e.g. submitted, in_review, approved, rejected, resubmitted
            $table->text('catatan')->nullable();
            $table->uuid('user_id')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('pengajuan_id')
                ->references('id')
                ->on('pengajuan_penilaian_risikos')
                ->cascadeOnDelete();

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->index(['pengajuan_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pengajuan_penilaian_risiko_histories');
        Schema::dropIfExists('pengajuan_penilaian_risiko_items');
        Schema::dropIfExists('pengajuan_penilaian_risikos');
    }
};
