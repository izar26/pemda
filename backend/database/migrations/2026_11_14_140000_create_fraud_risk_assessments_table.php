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
        Schema::create('fraud_risk_assessments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('opd_id')->constrained('opds')->cascadeOnDelete();
            $table->foreignUuid('periode_penilaian_id')->constrained('periode_penilaians')->cascadeOnDelete();
            $table->integer('nomor_urut')->nullable();
            $table->string('proses_bisnis', 255);
            $table->text('identifikasi_risiko_kecurangan');
            $table->text('skenario_kecurangan');
            $table->foreignUuid('jenis_fraud_id')->nullable()->constrained('master_jenis_frauds')->nullOnDelete();
            $table->string('jenis_risiko_kecurangan', 150);
            $table->string('pemilik_risiko', 150);
            $table->string('penyebab', 100);
            $table->text('existing_control');
            $table->string('kemungkinan_kriteria', 100);
            $table->tinyInteger('kemungkinan_skor');
            $table->string('dampak_kriteria', 100);
            $table->tinyInteger('dampak_skor');
            $table->tinyInteger('skala_risiko');
            $table->text('mitigasi');
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['opd_id', 'periode_penilaian_id'], 'idx_fra_opd_periode');
            $table->index(['periode_penilaian_id', 'opd_id', 'nomor_urut'], 'idx_fra_urutan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fraud_risk_assessments');
    }
};
