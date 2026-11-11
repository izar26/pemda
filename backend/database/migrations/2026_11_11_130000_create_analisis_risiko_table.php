<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analisis_risikos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('risiko_opd_item_id')->nullable()->unique()->constrained('identifikasi_risiko_opd_items')->cascadeOnDelete();
            $table->foreignUuid('risiko_operasional_item_id')->nullable()->unique()->constrained('identifikasi_risiko_opd_operasional_items')->cascadeOnDelete();
            $table->string('kriteria_kemungkinan')->nullable();
            $table->unsignedTinyInteger('inheren_kemungkinan')->nullable();
            $table->string('kriteria_dampak')->nullable();
            $table->unsignedTinyInteger('inheren_dampak')->nullable();
            $table->boolean('pengendalian_ada')->nullable();
            $table->text('pengendalian_uraian')->nullable();
            $table->foreignUuid('sub_unsur_spip_id')->nullable()->constrained('master_sub_unsur_spips')->restrictOnDelete();
            $table->boolean('pengendalian_memadai')->nullable();
            $table->unsignedTinyInteger('residual_kemungkinan')->nullable();
            $table->unsignedTinyInteger('residual_dampak')->nullable();
            $table->text('rencana_tindak')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('analisis_risikos');
    }
};
