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
        // 1. Table Konteks Penilaian Risiko Strategis OPD (Form 2B)
        Schema::create('konteks_penilaians', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('periode_penilaian_id');
            $table->uuid('opd_id');
            $table->uuid('sumber_data_id')->nullable();
            $table->uuid('tujuan_penilaian_id');
            $table->string('nama_pemda', 150)->default('Pemerintah Kabupaten Cianjur');
            $table->text('informasi_lain')->nullable();
            $table->string('nama_kepala', 150)->nullable();
            $table->string('nip_kepala', 50)->nullable();
            $table->string('jabatan_kepala', 150)->nullable();
            $table->date('tanggal_penetapan')->nullable();
            $table->string('status', 20)->default('draft'); // draft, final
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

            $table->foreign('tujuan_penilaian_id')
                ->references('id')
                ->on('tujuan_penilaians')
                ->cascadeOnDelete();

            $table->foreign('created_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            $table->foreign('updated_by')
                ->references('id')
                ->on('users')
                ->nullOnDelete();

            // 1 OPD hanya memiliki 1 penetapan konteks risiko strategis per periode penilaian aktif
            $table->unique(['periode_penilaian_id', 'opd_id'], 'uq_konteks_periode_opd');
        });

        // 2. Pivot Table Sasaran Strategis Terpilih di Form 2B
        Schema::create('konteks_penilaian_sasarans', function (Blueprint $table) {
            $table->uuid('konteks_penilaian_id');
            $table->uuid('sasaran_penilaian_id');
            $table->unsignedInteger('urutan')->default(1);
            $table->timestamps();

            $table->primary(['konteks_penilaian_id', 'sasaran_penilaian_id'], 'pk_konteks_sasaran');

            $table->foreign('konteks_penilaian_id')
                ->references('id')
                ->on('konteks_penilaians')
                ->cascadeOnDelete();

            $table->foreign('sasaran_penilaian_id')
                ->references('id')
                ->on('sasaran_penilaians')
                ->cascadeOnDelete();
        });

        // 3. Pivot Table IKU / Indikator Terpilih di Form 2B
        Schema::create('konteks_penilaian_indikators', function (Blueprint $table) {
            $table->uuid('konteks_penilaian_id');
            $table->uuid('indikator_penilaian_id');
            $table->unsignedInteger('urutan')->default(1);
            $table->timestamps();

            $table->primary(['konteks_penilaian_id', 'indikator_penilaian_id'], 'pk_konteks_indikator');

            $table->foreign('konteks_penilaian_id')
                ->references('id')
                ->on('konteks_penilaians')
                ->cascadeOnDelete();

            $table->foreign('indikator_penilaian_id')
                ->references('id')
                ->on('indikator_penilaians')
                ->cascadeOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('konteks_penilaian_indikators');
        Schema::dropIfExists('konteks_penilaian_sasarans');
        Schema::dropIfExists('konteks_penilaians');
    }
};
