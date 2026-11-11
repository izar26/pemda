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
        // 1. Header Table for Form 3C (Identifikasi Risiko Operasional OPD)
        Schema::create('identifikasi_risiko_opd_operasionals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('periode_penilaian_id');
            $table->uuid('opd_id');
            $table->uuid('master_urusan_pemerintahan_id')->nullable();
            $table->string('nama_pemda', 150)->default('Pemerintah Kabupaten Cianjur');
            $table->string('singkatan_opd', 50)->nullable();
            $table->string('nama_kepala_opd')->nullable();
            $table->string('nip_kepala_opd', 30)->nullable();
            $table->string('jabatan_kepala_opd')->nullable();
            $table->string('status', 30)->default('draft');
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

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();

            $table->unique(['periode_penilaian_id', 'opd_id'], 'identifikasi_opd_operasional_periode_unique');
            $table->index(['opd_id', 'status']);
        });

        // 2. Risk Items Table for Form 3C
        Schema::create('identifikasi_risiko_opd_operasional_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('identifikasi_risiko_opd_operasional_id');
            $table->uuid('operasional_sub_kegiatan_id')->nullable();
            $table->text('sub_kegiatan_kustom')->nullable();
            $table->text('indikator_keluaran_kustom')->nullable();
            $table->string('probis', 150)->nullable();
            $table->string('kategori_risiko', 100)->default('Risiko Operasional');
            $table->unsignedInteger('nomor_urut')->default(1);
            $table->text('pernyataan_risiko');
            $table->string('kode_risiko', 100);
            $table->string('pemilik_risiko', 150)->nullable();
            $table->string('sifat_risiko', 10)->default('C');
            $table->text('uraian_dampak')->nullable();
            $table->string('pihak_terkena', 255)->nullable();
            $table->unsignedInteger('urutan')->default(1);
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('identifikasi_risiko_opd_operasional_id', 'fk_iroo_items_parent')
                ->references('id')
                ->on('identifikasi_risiko_opd_operasionals')
                ->cascadeOnDelete();

            $table->foreign('operasional_sub_kegiatan_id', 'fk_iroo_items_sub_kegiatan')
                ->references('id')
                ->on('konteks_operasional_items')
                ->nullOnDelete();

            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['identifikasi_risiko_opd_operasional_id', 'urutan'], 'idx_iroo_items_urutan');
            $table->index('kode_risiko');
        });

        // 3. Update root_cause_analyses table for Form 3C items
        Schema::table('root_cause_analyses', function (Blueprint $table) {
            $table->uuid('identifikasi_risiko_opd_operasional_item_id')->nullable()->after('identifikasi_risiko_opd_item_id');

            $table->foreign('identifikasi_risiko_opd_operasional_item_id', 'fk_rca_iroo_item')
                ->references('id')
                ->on('identifikasi_risiko_opd_operasional_items')
                ->cascadeOnDelete();

            $table->index('identifikasi_risiko_opd_operasional_item_id', 'idx_rca_iroo_item');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('root_cause_analyses', function (Blueprint $table) {
            $table->dropForeign('fk_rca_iroo_item');
            $table->dropColumn('identifikasi_risiko_opd_operasional_item_id');
        });

        Schema::dropIfExists('identifikasi_risiko_opd_operasional_items');
        Schema::dropIfExists('identifikasi_risiko_opd_operasionals');
    }
};
