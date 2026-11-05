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
        Schema::table('pengajuan_penilaian_risikos', function (Blueprint $table) {
            $table->string('current_tier', 30)->default('operator')->after('status');

            $table->uuid('kepala_opd_id')->nullable()->after('auditor_id');
            $table->timestamp('kepala_opd_approved_at')->nullable()->after('submitted_at');

            $table->timestamp('auditor_reviewed_at')->nullable()->after('kepala_opd_approved_at');

            $table->uuid('pengawas_id')->nullable()->after('kepala_opd_id');
            $table->timestamp('pengawas_approved_at')->nullable()->after('approved_at');

            $table->foreign('kepala_opd_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->foreign('pengawas_id')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->index(['current_tier', 'status']);
        });

        Schema::table('pengajuan_penilaian_risiko_items', function (Blueprint $table) {
            $table->string('status_kepala_opd', 30)->default('draft')->after('status');
            $table->text('catatan_kepala_opd')->nullable()->after('catatan_revisi');

            $table->string('status_auditor', 30)->default('draft')->after('status_kepala_opd');
            $table->text('catatan_auditor')->nullable()->after('catatan_kepala_opd');

            $table->string('status_pengawas', 30)->default('draft')->after('status_auditor');
            $table->text('catatan_pengawas')->nullable()->after('catatan_auditor');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pengajuan_penilaian_risiko_items', function (Blueprint $table) {
            $table->dropColumn([
                'status_kepala_opd',
                'catatan_kepala_opd',
                'status_auditor',
                'catatan_auditor',
                'status_pengawas',
                'catatan_pengawas',
            ]);
        });

        Schema::table('pengajuan_penilaian_risikos', function (Blueprint $table) {
            $table->dropForeign(['kepala_opd_id']);
            $table->dropForeign(['pengawas_id']);
            $table->dropIndex(['current_tier', 'status']);

            $table->dropColumn([
                'current_tier',
                'kepala_opd_id',
                'kepala_opd_approved_at',
                'auditor_reviewed_at',
                'pengawas_id',
                'pengawas_approved_at',
            ]);
        });
    }
};
