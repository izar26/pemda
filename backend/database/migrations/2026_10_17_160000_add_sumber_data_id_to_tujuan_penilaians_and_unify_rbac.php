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
        if (!Schema::hasColumn('tujuan_penilaians', 'sumber_data_id')) {
            Schema::table('tujuan_penilaians', function (Blueprint $table) {
                $table->uuid('sumber_data_id')
                    ->nullable()
                    ->after('opd_id');

                $table->foreign('sumber_data_id')
                    ->references('id')
                    ->on('master_sumber_datas')
                    ->nullOnDelete();
            });
        }

        // Backfill existing tujuan_penilaians with default MasterSumberData if available
        if (Schema::hasTable('master_sumber_datas') && Schema::hasTable('tujuan_penilaians')) {
            $defaultSumber = DB::table('master_sumber_datas')
                ->where('is_active', true)
                ->orderBy('created_at', 'asc')
                ->first();

            if ($defaultSumber) {
                DB::table('tujuan_penilaians')
                    ->whereNull('sumber_data_id')
                    ->update(['sumber_data_id' => $defaultSumber->id]);
            }
        }

        // Unify RBAC group for Tujuan, Sasaran & Indikator
        if (Schema::hasTable('permissions')) {
            DB::table('permissions')
                ->whereIn('name', [
                    'tujuan.view',
                    'tujuan.create',
                    'tujuan.edit',
                    'tujuan.delete',
                    'tujuan.copy',
                ])
                ->update(['group' => 'Tujuan, Sasaran & Indikator']);

            DB::table('permissions')
                ->whereIn('name', [
                    'sasaran.view',
                    'sasaran.create',
                    'sasaran.edit',
                    'sasaran.delete',
                    'sasaran.copy',
                    'iku.view',
                    'iku.create',
                    'iku.edit',
                    'iku.delete',
                    'iku.copy',
                ])
                ->delete();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('tujuan_penilaians', 'sumber_data_id')) {
            Schema::table('tujuan_penilaians', function (Blueprint $table) {
                $table->dropForeign(['sumber_data_id']);
                $table->dropColumn('sumber_data_id');
            });
        }
    }
};
