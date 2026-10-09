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
        // Sheet 2B: Penetapan Konteks Risiko Strategis OPD (Fitur No 26)
        Schema::create('konteks_risiko_strategis', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('periode_penilaian_id')->constrained('periode_penilaians')->onDelete('cascade');
            $table->foreignUuid('opd_id')->constrained('opds')->onDelete('cascade');
            $table->string('sumber_data', 150)->default('Renstra SKPD');
            $table->foreignUuid('tujuan_id')->nullable()->constrained('tujuans')->onDelete('set null');
            $table->json('sasaran_ids')->nullable(); // Array of selected Sasaran UUIDs
            $table->json('iku_ids')->nullable();     // Array of selected IKU / Indikator UUIDs
            $table->text('informasi_lain')->nullable();
            $table->string('kepala_opd_nama', 200)->nullable();
            $table->string('kepala_opd_nip', 50)->nullable();
            $table->date('tanggal_penetapan')->nullable();
            $table->enum('status', ['draft', 'final'])->default('draft');
            $table->timestamps();

            $table->unique(['periode_penilaian_id', 'opd_id'], 'konteks_periode_opd_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('konteks_risiko_strategis');
    }
};
