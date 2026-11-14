<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pemantauan_pengendalian_risikos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('analisis_risiko_id')->unique()->constrained('analisis_risikos')->cascadeOnDelete();
            $table->text('bentuk_pemantauan')->nullable();
            $table->text('penanggung_jawab_pemantauan')->nullable();
            $table->text('rencana_waktu_pemantauan')->nullable();
            $table->text('realisasi_waktu_pemantauan')->nullable();
            $table->text('keterangan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pemantauan_pengendalian_risikos');
    }
};
