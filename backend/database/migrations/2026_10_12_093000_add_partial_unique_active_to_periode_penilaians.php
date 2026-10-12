<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Enforce physical single active period at PostgreSQL engine level
        DB::statement("CREATE UNIQUE INDEX IF NOT EXISTS unique_single_active_periode ON periode_penilaians (status) WHERE status = 'aktif';");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS unique_single_active_periode;');
    }
};
