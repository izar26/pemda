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
        Schema::create('auditor_opd_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('auditor_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('opd_id')->constrained('opds')->cascadeOnDelete();
            $table->foreignUuid('periode_penilaian_id')->nullable()->constrained('periode_penilaians')->nullOnDelete();
            $table->foreignUuid('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('nomor_surat_tugas', 100)->nullable();
            $table->date('tanggal_mulai')->nullable();
            $table->date('tanggal_selesai')->nullable();
            $table->text('catatan')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['auditor_id', 'opd_id'], 'auditor_opd_unique');
            $table->index(['auditor_id', 'is_active']);
            $table->index(['opd_id', 'is_active']);
            $table->index('periode_penilaian_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('auditor_opd_assignments');
    }
};
