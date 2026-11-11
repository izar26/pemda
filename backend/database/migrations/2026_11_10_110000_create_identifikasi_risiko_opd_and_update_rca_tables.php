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
        // 1. Dokumen Induk Form 3B: Identifikasi Risiko Strategis OPD
        Schema::create('identifikasi_risiko_opds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('periode_penilaian_id');
            $table->uuid('opd_id');
            $table->uuid('master_urusan_pemerintahan_id')->nullable();
            $table->string('nama_pemda', 150)->default('Pemerintah Kabupaten Cianjur');
            $table->string('singkatan_opd', 50)->nullable();
            $table->string('nama_kepala_opd', 255)->nullable();
            $table->string('nip_kepala_opd', 50)->nullable();
            $table->string('jabatan_kepala_opd', 150)->nullable();
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

            $table->unique(['periode_penilaian_id', 'opd_id'], 'uq_identifikasi_opd_periode_opd');
        });

        // 2. Baris Item Risiko Form 3B
        Schema::create('identifikasi_risiko_opd_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('identifikasi_risiko_opd_id');
            $table->uuid('sasaran_penilaian_id')->nullable();
            $table->text('sasaran_kustom')->nullable();
            $table->uuid('indikator_penilaian_id')->nullable();
            $table->text('indikator_kustom')->nullable();
            $table->string('kategori_risiko', 50);
            $table->unsignedInteger('nomor_urut')->default(1);
            $table->text('pernyataan_risiko');
            $table->string('kode_risiko', 50);
            $table->string('pemilik_risiko', 150)->default('Kepala Perangkat Daerah');
            $table->string('sifat_risiko', 10)->default('C'); // C / UC
            $table->text('uraian_dampak')->nullable();
            $table->string('pihak_terkena', 255)->nullable();
            $table->unsignedInteger('urutan')->default(1);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('identifikasi_risiko_opd_id')
                ->references('id')
                ->on('identifikasi_risiko_opds')
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

            $table->index(['identifikasi_risiko_opd_id', 'urutan'], 'idx_identifikasi_opd_items_order');
        });

        // 3. Update root_cause_analyses untuk mendukung Item 3B
        Schema::table('root_cause_analyses', function (Blueprint $table) {
            $table->string('source_type', 10)->default('3a')->after('id');
            $table->uuid('identifikasi_risiko_pemda_item_id')->nullable()->change();
            $table->uuid('identifikasi_risiko_opd_item_id')->nullable()->after('identifikasi_risiko_pemda_item_id');

            $table->foreign('identifikasi_risiko_opd_item_id')
                ->references('id')
                ->on('identifikasi_risiko_opd_items')
                ->cascadeOnDelete();

            $table->index(['source_type', 'identifikasi_risiko_opd_item_id'], 'idx_rca_opd_item');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('root_cause_analyses', function (Blueprint $table) {
            $table->dropForeign(['identifikasi_risiko_opd_item_id']);
            $table->dropColumn(['identifikasi_risiko_opd_item_id', 'source_type']);
        });

        Schema::dropIfExists('identifikasi_risiko_opd_items');
        Schema::dropIfExists('identifikasi_risiko_opds');
    }
};
