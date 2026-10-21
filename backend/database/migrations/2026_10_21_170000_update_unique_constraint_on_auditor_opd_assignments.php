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
        Schema::table('auditor_opd_assignments', function (Blueprint $table) {
            $table->dropUnique('auditor_opd_unique');
            $table->unique('opd_id', 'auditor_opd_assignments_opd_id_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('auditor_opd_assignments', function (Blueprint $table) {
            $table->dropUnique('auditor_opd_assignments_opd_id_unique');
            $table->unique(['auditor_id', 'opd_id'], 'auditor_opd_unique');
        });
    }
};
