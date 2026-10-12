<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Clean up duplicate cycles: for each (tahun_mulai, tahun_akhir), keep active or latest record
        $duplicates = DB::table('periode_penilaians')
            ->select('tahun_mulai', 'tahun_akhir')
            ->groupBy('tahun_mulai', 'tahun_akhir')
            ->havingRaw('count(*) > 1')
            ->get();

        foreach ($duplicates as $dup) {
            $records = DB::table('periode_penilaians')
                ->where('tahun_mulai', $dup->tahun_mulai)
                ->where('tahun_akhir', $dup->tahun_akhir)
                ->orderByRaw("CASE WHEN status = 'aktif' THEN 1 ELSE 2 END ASC")
                ->orderBy('tahun_penilaian', 'desc')
                ->get();

            // Keep the first (active or highest year), delete the rest
            $keepId = $records->first()->id;
            DB::table('periode_penilaians')
                ->where('tahun_mulai', $dup->tahun_mulai)
                ->where('tahun_akhir', $dup->tahun_akhir)
                ->where('id', '!=', $keepId)
                ->delete();
        }

        // 2. Adjust unique constraints
        Schema::table('periode_penilaians', function (Blueprint $table) {
            $table->dropUnique('unique_periode_tahun_penilaian');
            $table->unique(['tahun_mulai', 'tahun_akhir'], 'unique_cycle_periode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('periode_penilaians', function (Blueprint $table) {
            $table->dropUnique('unique_cycle_periode');
            $table->unique(['tahun_mulai', 'tahun_akhir', 'tahun_penilaian'], 'unique_periode_tahun_penilaian');
        });
    }
};
