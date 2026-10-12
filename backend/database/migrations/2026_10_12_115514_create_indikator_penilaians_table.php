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
        Schema::create('indikator_penilaians', function (Blueprint $table) {
            $table->uuid('id')->primary();

            // Relasi ke Periode Penilaian (RPJMD 5 Tahunan)
            $table->foreignUuid('periode_penilaian_id')
                ->constrained('periode_penilaians')
                ->cascadeOnDelete();

            // Relasi ke Perangkat Daerah (OPD)
            $table->foreignUuid('opd_id')
                ->constrained('opds')
                ->cascadeOnDelete();

            // Relasi ke Tujuan Renstra OPD
            $table->foreignUuid('tujuan_penilaian_id')
                ->constrained('tujuan_penilaians')
                ->cascadeOnDelete();

            // Relasi ke Sasaran Renstra OPD (Mandatory parent)
            $table->foreignUuid('sasaran_penilaian_id')
                ->constrained('sasaran_penilaians')
                ->cascadeOnDelete();

            // Kode Indikator (e.g. IKU-01, IND-01)
            $table->string('kode_indikator', 50)->nullable();

            // Rumusan Pernyataan Indikator / IKU
            $table->text('indikator');

            // Target Kinerja & Satuan Pengukuran
            $table->string('target', 100)->nullable();
            $table->string('satuan', 100)->nullable();

            // Klasifikasi Jenis: IKU (Indikator Kinerja Utama) vs Biasa (Indikator Renstra)
            $table->enum('jenis', ['IKU', 'Biasa'])->default('IKU');

            // Nomor Urut Tampilan
            $table->unsignedSmallInteger('urutan')->default(1);

            // Sumber Dokumen / Dasar Hukum / Catatan
            $table->text('keterangan')->nullable();

            // Audit Trail pembuat data
            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            // Indexes for high performance filtering
            $table->index(['periode_penilaian_id', 'opd_id']);
            $table->index(['sasaran_penilaian_id']);
            $table->index(['tujuan_penilaian_id']);
            $table->index(['jenis']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('indikator_penilaians');
    }
};
