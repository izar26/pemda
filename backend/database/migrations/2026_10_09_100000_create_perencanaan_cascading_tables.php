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
        // 1. Fitur No 13 - Form Penentuan Periode Penilaian
        Schema::create('periode_penilaians', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('periode', 50); // e.g. "2026-2030"
            $table->integer('tahun'); // e.g. 2027
            $table->date('tanggal_mulai');
            $table->date('tanggal_berakhir');
            $table->enum('status', ['active', 'inactive', 'archived'])->default('active')->index();
            $table->text('catatan')->nullable();
            $table->timestamps();
        });

        // 2. Fitur No 14 - Cascading Tabel Tujuan (Bapperida)
        Schema::create('tujuans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('periode_penilaian_id')->constrained('periode_penilaians')->onDelete('cascade');
            $table->foreignUuid('opd_id')->constrained('opds')->onDelete('cascade');
            $table->string('nomor', 20)->default('T.1');
            $table->text('tujuan');
            $table->integer('urutan')->default(1);
            $table->timestamps();
        });

        // 3. Fitur No 15 - Cascading Tabel Sasaran
        Schema::create('sasarans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tujuan_id')->constrained('tujuans')->onDelete('cascade');
            $table->foreignUuid('periode_penilaian_id')->constrained('periode_penilaians')->onDelete('cascade');
            $table->string('nomor', 20)->default('S.1.1');
            $table->text('sasaran');
            $table->integer('urutan')->default(1);
            $table->timestamps();
        });

        // 4. Fitur No 16/17 - Cascading Tabel Indikator Sasaran
        Schema::create('indikator_sasarans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('sasaran_id')->constrained('sasarans')->onDelete('cascade');
            $table->foreignUuid('periode_penilaian_id')->constrained('periode_penilaians')->onDelete('cascade');
            $table->string('nomor', 20)->default('I.1.1.1');
            $table->text('indikator');
            $table->enum('jenis', ['utama', 'pendukung'])->default('utama');
            $table->string('satuan', 50)->nullable();
            $table->string('target', 100)->nullable();
            $table->integer('urutan')->default(1);
            $table->timestamps();
        });

        // 5. Sheet 2B/2C - Renstra SKPD (Program)
        Schema::create('renstra_programs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('periode_penilaian_id')->constrained('periode_penilaians')->onDelete('cascade');
            $table->foreignUuid('opd_id')->constrained('opds')->onDelete('cascade');
            $table->string('kode', 50)->default('A');
            $table->string('nama', 255);
            $table->text('indikator')->nullable();
            $table->string('target', 100)->nullable();
            $table->string('satuan', 50)->nullable();
            $table->integer('urutan')->default(1);
            $table->timestamps();
        });

        // 6. Sheet 2C - Renstra SKPD (Kegiatan)
        Schema::create('renstra_kegiatans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('renstra_program_id')->constrained('renstra_programs')->onDelete('cascade');
            $table->foreignUuid('periode_penilaian_id')->constrained('periode_penilaians')->onDelete('cascade');
            $table->foreignUuid('opd_id')->constrained('opds')->onDelete('cascade');
            $table->string('kode', 50)->default('A.1');
            $table->string('nama', 255);
            $table->text('indikator')->nullable();
            $table->string('target', 100)->nullable();
            $table->string('satuan', 50)->nullable();
            $table->integer('urutan')->default(1);
            $table->timestamps();
        });

        // 7. Sheet 2C - Renstra SKPD (Sub Kegiatan - Objek Risikio)
        Schema::create('renstra_sub_kegiatans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('renstra_kegiatan_id')->constrained('renstra_kegiatans')->onDelete('cascade');
            $table->foreignUuid('periode_penilaian_id')->constrained('periode_penilaians')->onDelete('cascade');
            $table->foreignUuid('opd_id')->constrained('opds')->onDelete('cascade');
            $table->string('kode', 50)->default('A.1.1');
            $table->string('nama', 255);
            $table->text('indikator')->nullable();
            $table->string('target', 100)->nullable();
            $table->string('satuan', 50)->nullable();
            $table->string('sipd_id', 100)->nullable()->index(); // Prepared for SIPD integration
            $table->integer('urutan')->default(1);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('renstra_sub_kegiatans');
        Schema::dropIfExists('renstra_kegiatans');
        Schema::dropIfExists('renstra_programs');
        Schema::dropIfExists('indikator_sasarans');
        Schema::dropIfExists('sasarans');
        Schema::dropIfExists('tujuans');
        Schema::dropIfExists('periode_penilaians');
    }
};
