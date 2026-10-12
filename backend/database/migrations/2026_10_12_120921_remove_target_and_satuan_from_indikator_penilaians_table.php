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
        Schema::table('indikator_penilaians', function (Blueprint $table) {
            $table->dropColumn(['target', 'satuan']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('indikator_penilaians', function (Blueprint $table) {
            $table->string('target', 100)->nullable();
            $table->string('satuan', 100)->nullable();
        });
    }
};
