<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('analisis_risikos', function (Blueprint $table) {
            $table->string('residual_kriteria_kemungkinan')->nullable();
            $table->string('residual_kriteria_dampak')->nullable();
        });
        DB::table('analisis_risikos')->update([
            'residual_kriteria_kemungkinan' => DB::raw('kriteria_kemungkinan'),
            'residual_kriteria_dampak' => DB::raw('kriteria_dampak'),
        ]);
    }

    public function down(): void
    {
        Schema::table('analisis_risikos', function (Blueprint $table) {
            $table->dropColumn(['residual_kriteria_kemungkinan', 'residual_kriteria_dampak']);
        });
    }
};
