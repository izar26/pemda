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
        // 1. Dokumen Induk Form 3A: Identifikasi Risiko Strategis Pemda per OPD
        Schema::create('identifikasi_risiko_pemdas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('periode_penilaian_id');
            $table->uuid('opd_id');
            $table->uuid('master_urusan_pemerintahan_id')->nullable();
            $table->string('nama_pemda', 150)->default('Pemerintah Kabupaten Cianjur');
            $table->string('status', 20)->default('draft'); // draft, submitted, approved
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('periode_penilaian_id')
                ->references('id')
                ->on('periode_penilaians')
                ->cascadeOnDelete();

            $table->foreign('opd_id')
                ->references('id')
                ->on('opds')
                ->cascadeOnDelete();

            $table->foreign('master_urusan_pemerintahan_id')
                ->references('id')
                ->on('master_urusan_pemerintahans')
                ->nullOnDelete();

            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->foreign('updated_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->unique(['periode_penilaian_id', 'opd_id'], 'uq_identifikasi_pemda_periode_opd');
        });

        // 2. Baris Item Risiko Form 3A
        Schema::create('identifikasi_risiko_pemda_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('identifikasi_risiko_pemda_id');
            $table->uuid('sasaran_penilaian_id')->nullable();
            $table->text('sasaran_kustom')->nullable();
            $table->uuid('indikator_penilaian_id')->nullable();
            $table->text('indikator_kustom')->nullable();
            $table->string('kategori_risiko', 50);
            $table->unsignedInteger('nomor_urut')->default(1);
            $table->text('pernyataan_risiko');
            $table->string('kode_risiko', 50);
            $table->string('pemilik_risiko', 150)->default('Kepala Daerah');
            $table->string('sifat_risiko', 10)->default('C'); // C / UC
            $table->text('uraian_dampak')->nullable();
            $table->string('pihak_terkena', 255)->nullable();
            $table->unsignedInteger('urutan')->default(1);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('identifikasi_risiko_pemda_id')
                ->references('id')
                ->on('identifikasi_risiko_pemdas')
                ->cascadeOnDelete();

            $table->foreign('sasaran_penilaian_id')
                ->references('id')
                ->on('sasaran_penilaians')
                ->nullOnDelete();

            $table->foreign('indikator_penilaian_id')
                ->references('id')
                ->on('indikator_penilaians')
                ->nullOnDelete();

            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->foreign('updated_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->index(['identifikasi_risiko_pemda_id', 'urutan'], 'idx_identifikasi_pemda_items_order');
        });

        // 3. Root Cause Analysis (RCA 5-Whys) per Item Risiko 3A
        Schema::create('root_cause_analyses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('identifikasi_risiko_pemda_item_id')->unique('uq_rca_item_risiko');
            $table->text('why_1')->nullable();
            $table->text('why_2')->nullable();
            $table->text('why_3')->nullable();
            $table->text('why_4')->nullable();
            $table->text('why_5')->nullable();
            $table->text('akar_penyebab')->nullable();
            $table->string('jenis_penyebab', 50)->nullable(); // Man, Money, Method, Machine, Material, Eksternal
            $table->text('kegiatan_pengendalian')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('identifikasi_risiko_pemda_item_id')
                ->references('id')
                ->on('identifikasi_risiko_pemda_items')
                ->cascadeOnDelete();

            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->foreign('updated_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('root_cause_analyses');
        Schema::dropIfExists('identifikasi_risiko_pemda_items');
        Schema::dropIfExists('identifikasi_risiko_pemdas');
    }
};
