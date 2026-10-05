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
        Schema::table('users', function (Blueprint $table) {
            $table->foreignUuid('opd_id')->nullable()->after('phone')->constrained('opds')->nullOnDelete();
            $table->string('pangkat_gol', 60)->nullable()->after('opd_id');
            $table->string('jabatan', 150)->nullable()->after('pangkat_gol');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['opd_id']);
            $table->dropColumn(['opd_id', 'pangkat_gol', 'jabatan']);
        });
    }
};
