<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('komunikasi_pengendalian_risikos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('analisis_risiko_id')->unique()->constrained('analisis_risikos')->cascadeOnDelete();
            $table->text('media_komunikasi')->nullable();
            $table->text('penyedia_informasi')->nullable();
            $table->text('penerima_informasi')->nullable();
            $table->text('rencana_waktu')->nullable();
            $table->text('realisasi_waktu')->nullable();
            $table->text('keterangan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('komunikasi_pengendalian_risikos');
    }
};
