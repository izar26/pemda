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
        // 1. Drop master_entitas_penilaians table
        Schema::dropIfExists('master_entitas_penilaians');

        // 2. Add urutan column to opds if not exists
        if (!Schema::hasColumn('opds', 'urutan')) {
            Schema::table('opds', function (Blueprint $table) {
                $table->unsignedInteger('urutan')->default(0);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('opds', 'urutan')) {
            Schema::table('opds', function (Blueprint $table) {
                $table->dropColumn('urutan');
            });
        }

        Schema::create('master_entitas_penilaians', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 20);
            $table->string('nama', 200);
            $table->foreignId('opd_id')->nullable()->constrained('opds')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });
    }
};
