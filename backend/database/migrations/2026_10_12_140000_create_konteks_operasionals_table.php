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
        // 1. Header Dokumen Penetapan Konteks Risiko Operasional OPD (Form 2C)
        Schema::create('konteks_operasionals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('periode_penilaian_id');
            $table->uuid('opd_id');
            $table->uuid('sumber_data_id')->nullable();
            $table->uuid('konteks_penilaian_id')->nullable(); // Relasi ke Form 2B (Tujuan Strategis)

            $table->string('nama_pemda', 150)->default('Pemerintah Kabupaten Cianjur');
            $table->text('informasi_lain')->nullable();

            // Lembar Pengesahan Kepala OPD
            $table->string('nama_kepala', 150)->nullable();
            $table->string('nip_kepala', 50)->nullable();
            $table->string('jabatan_kepala', 150)->nullable();
            $table->date('tanggal_penetapan')->nullable();

            $table->string('status', 20)->default('draft')->index(); // draft, final

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

            $table->foreign('sumber_data_id')
                ->references('id')
                ->on('master_sumber_datas')
                ->nullOnDelete();

            $table->foreign('konteks_penilaian_id')
                ->references('id')
                ->on('konteks_penilaians')
                ->nullOnDelete();

            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->foreign('updated_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            // Hanya ada 1 dokumen Form 2C per OPD per Periode Penilaian
            $table->unique(['periode_penilaian_id', 'opd_id'], 'uq_opd_periode_konteks_operasional');
        });

        // 2. Item Hierarki: Program, Kegiatan, dan Sub-Kegiatan (Self-referencing Tree)
        Schema::create('konteks_operasional_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('konteks_operasional_id');
            $table->uuid('parent_id')->nullable();

            $table->string('jenis', 30)->index(); // program, kegiatan, sub_kegiatan
            $table->string('kode', 50); // A, A.1, B.1.1
            $table->text('nama');
            $table->integer('urutan')->default(1);
            $table->timestamps();

            $table->foreign('konteks_operasional_id')
                ->references('id')
                ->on('konteks_operasionals')
                ->cascadeOnDelete();

            $table->index(['konteks_operasional_id', 'parent_id', 'jenis'], 'idx_konteks_item_tree');
        });

        // Self-referencing FK on konteks_operasional_items
        Schema::table('konteks_operasional_items', function (Blueprint $table) {
            $table->foreign('parent_id')
                ->references('id')
                ->on('konteks_operasional_items')
                ->cascadeOnDelete();
        });

        // 3. Pasangan Indikator dan Target pada setiap Item (Program/Kegiatan/Sub-Kegiatan)
        Schema::create('konteks_operasional_indikators', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('item_id');

            $table->text('indikator');
            $table->string('target', 100);
            $table->string('satuan', 50)->nullable();
            $table->integer('urutan')->default(1);
            $table->timestamps();

            $table->foreign('item_id')
                ->references('id')
                ->on('konteks_operasional_items')
                ->cascadeOnDelete();

            $table->index(['item_id', 'urutan'], 'idx_item_indikator_urutan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('konteks_operasional_indikators');
        Schema::dropIfExists('konteks_operasional_items');
        Schema::dropIfExists('konteks_operasionals');
    }
};
