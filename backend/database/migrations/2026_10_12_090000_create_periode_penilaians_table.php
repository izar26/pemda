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
        Schema::create('periode_penilaians', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('nama_periode', 100); // e.g. "RPJMD 2026 - 2030"
            $table->unsignedSmallInteger('tahun_mulai'); // e.g. 2026
            $table->unsignedSmallInteger('tahun_akhir'); // e.g. 2030
            $table->unsignedSmallInteger('tahun_penilaian'); // e.g. 2027
            $table->date('tanggal_mulai'); // e.g. 2027-01-02
            $table->date('tanggal_akhir'); // e.g. 2027-12-30
            $table->string('status', 20)->default('tidak_aktif'); // aktif, tidak_aktif, arsip
            $table->text('keterangan')->nullable();
            $table->uuid('created_by')->nullable();

            $table->timestamps();

            // Indexes for fast lookups
            $table->index('status');
            $table->index('tahun_penilaian');
            $table->unique(['tahun_mulai', 'tahun_akhir', 'tahun_penilaian'], 'unique_periode_tahun_penilaian');

            // Foreign key to users
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('periode_penilaians');
    }
};
