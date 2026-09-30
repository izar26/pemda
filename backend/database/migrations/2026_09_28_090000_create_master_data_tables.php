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
        // 1. Pemilik Risiko
        Schema::create('master_pemilik_risikos', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 150);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });

        // 2. Kategori Risiko
        Schema::create('master_kategori_risikos', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 20)->unique();
            $table->string('nama', 150);
            $table->text('definisi')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });

        // 3. Penyebab Risiko (5M + 1E)
        Schema::create('master_penyebab_risikos', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 150);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });

        // 4. Tingkat Risiko (RSP, RSO, ROO)
        Schema::create('master_tingkat_risikos', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 20)->unique();
            $table->string('nama', 150);
            $table->text('deskripsi')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });

        // 5. Jenis Fraud
        Schema::create('master_jenis_frauds', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 150);
            $table->text('deskripsi')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });

        // 6. Kriteria Dampak
        Schema::create('master_kriteria_dampaks', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 150);
            $table->text('deskripsi')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });

        // 7. Urusan Pemerintahan
        Schema::create('master_urusan_pemerintahans', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 20);
            $table->string('nama', 200);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });

        // 8. Entitas Penilaian
        Schema::create('master_entitas_penilaians', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 20);
            $table->string('nama', 200);
            $table->foreignId('opd_id')->nullable()->constrained('opds')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });

        // 9. Sumber Data
        Schema::create('master_sumber_datas', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 150);
            $table->text('deskripsi')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });

        // 10. Unsur SPIP
        Schema::create('master_unsur_spips', function (Blueprint $table) {
            $table->id();
            $table->string('nomor', 10);
            $table->string('nama', 200);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });

        // 10b. Sub-Unsur SPIP (Bagian dari Unsur)
        Schema::create('master_sub_unsur_spips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unsur_spip_id')->constrained('master_unsur_spips')->cascadeOnDelete();
            $table->string('nama', 255);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('master_sub_unsur_spips');
        Schema::dropIfExists('master_unsur_spips');
        Schema::dropIfExists('master_sumber_datas');
        Schema::dropIfExists('master_entitas_penilaians');
        Schema::dropIfExists('master_urusan_pemerintahans');
        Schema::dropIfExists('master_kriteria_dampaks');
        Schema::dropIfExists('master_jenis_frauds');
        Schema::dropIfExists('master_tingkat_risikos');
        Schema::dropIfExists('master_penyebab_risikos');
        Schema::dropIfExists('master_kategori_risikos');
        Schema::dropIfExists('master_pemilik_risikos');
    }
};
