<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tindak_pengendalian_risikos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('analisis_risiko_id')->unique()->constrained('analisis_risikos')->cascadeOnDelete();
            $table->text('celah_pengendalian')->nullable();
            $table->text('penanggung_jawab')->nullable();
            $table->text('target_waktu')->nullable();
            $table->unsignedTinyInteger('treated_kemungkinan')->nullable();
            $table->unsignedTinyInteger('treated_dampak')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tindak_pengendalian_risikos');
    }
};
