<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('status_kejadian_risiko_opds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('opd_id')->constrained('opds')->cascadeOnDelete();
            $table->foreignUuid('periode_penilaian_id')->constrained('periode_penilaians')->cascadeOnDelete();
            $table->boolean('is_nihil')->default(false);
            $table->foreignUuid('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->unique(['opd_id', 'periode_penilaian_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('status_kejadian_risiko_opds');
    }
};
