<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pencatatan_kejadian_risikos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('opd_id')->constrained('opds')->cascadeOnDelete();
            $table->foreignUuid('periode_penilaian_id')->constrained('periode_penilaians')->cascadeOnDelete();
            $table->string('source_type');
            $table->foreignUuid('identifikasi_risiko_pemda_item_id')->nullable()->constrained('identifikasi_risiko_pemda_items')->cascadeOnDelete();
            $table->foreignUuid('identifikasi_risiko_opd_item_id')->nullable()->constrained('identifikasi_risiko_opd_items')->cascadeOnDelete();
            $table->foreignUuid('identifikasi_risiko_opd_operasional_item_id')->nullable()->constrained('identifikasi_risiko_opd_operasional_items')->cascadeOnDelete();
            $table->date('tanggal_kejadian');
            $table->text('sebab');
            $table->text('dampak');
            $table->text('keterangan')->nullable();
            $table->text('realisasi_waktu_rtp')->nullable();
            $table->text('keterangan_rtp')->nullable();
            $table->timestamps();

            $table->index(['opd_id', 'periode_penilaian_id']);
            $table->index('source_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pencatatan_kejadian_risikos');
    }
};
