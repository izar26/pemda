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
        // 1. master_sub_unsur_spips -> master_unsur_spips
        Schema::table('master_sub_unsur_spips', function (Blueprint $table) {
            $table->dropForeign(['unsur_spip_id']);
            $table->foreign('unsur_spip_id')
                ->references('id')
                ->on('master_unsur_spips')
                ->restrictOnDelete();
        });

        // 2. tujuan_penilaians -> master_sumber_datas, opds, periode_penilaians
        Schema::table('tujuan_penilaians', function (Blueprint $table) {
            $table->dropForeign(['sumber_data_id']);
            $table->foreign('sumber_data_id')
                ->references('id')
                ->on('master_sumber_datas')
                ->restrictOnDelete();

            $table->dropForeign(['opd_id']);
            $table->foreign('opd_id')
                ->references('id')
                ->on('opds')
                ->restrictOnDelete();

            $table->dropForeign(['periode_penilaian_id']);
            $table->foreign('periode_penilaian_id')
                ->references('id')
                ->on('periode_penilaians')
                ->restrictOnDelete();
        });

        // 3. sasaran_penilaians -> tujuan_penilaians, opds, periode_penilaians
        Schema::table('sasaran_penilaians', function (Blueprint $table) {
            $table->dropForeign(['tujuan_penilaian_id']);
            $table->foreign('tujuan_penilaian_id')
                ->references('id')
                ->on('tujuan_penilaians')
                ->restrictOnDelete();

            $table->dropForeign(['opd_id']);
            $table->foreign('opd_id')
                ->references('id')
                ->on('opds')
                ->restrictOnDelete();

            $table->dropForeign(['periode_penilaian_id']);
            $table->foreign('periode_penilaian_id')
                ->references('id')
                ->on('periode_penilaians')
                ->restrictOnDelete();
        });

        // 4. indikator_penilaians -> sasaran_penilaians, tujuan_penilaians, opds, periode_penilaians
        Schema::table('indikator_penilaians', function (Blueprint $table) {
            $table->dropForeign(['sasaran_penilaian_id']);
            $table->foreign('sasaran_penilaian_id')
                ->references('id')
                ->on('sasaran_penilaians')
                ->restrictOnDelete();

            $table->dropForeign(['tujuan_penilaian_id']);
            $table->foreign('tujuan_penilaian_id')
                ->references('id')
                ->on('tujuan_penilaians')
                ->restrictOnDelete();

            $table->dropForeign(['opd_id']);
            $table->foreign('opd_id')
                ->references('id')
                ->on('opds')
                ->restrictOnDelete();

            $table->dropForeign(['periode_penilaian_id']);
            $table->foreign('periode_penilaian_id')
                ->references('id')
                ->on('periode_penilaians')
                ->restrictOnDelete();
        });

        // 5. konteks_penilaians -> master_sumber_datas, tujuan_penilaians, opds, periode_penilaians
        Schema::table('konteks_penilaians', function (Blueprint $table) {
            $table->dropForeign(['sumber_data_id']);
            $table->foreign('sumber_data_id')
                ->references('id')
                ->on('master_sumber_datas')
                ->restrictOnDelete();

            $table->dropForeign(['tujuan_penilaian_id']);
            $table->foreign('tujuan_penilaian_id')
                ->references('id')
                ->on('tujuan_penilaians')
                ->restrictOnDelete();

            $table->dropForeign(['opd_id']);
            $table->foreign('opd_id')
                ->references('id')
                ->on('opds')
                ->restrictOnDelete();

            $table->dropForeign(['periode_penilaian_id']);
            $table->foreign('periode_penilaian_id')
                ->references('id')
                ->on('periode_penilaians')
                ->restrictOnDelete();
        });

        // 6. konteks_operasionals -> master_sumber_datas, opds, periode_penilaians
        Schema::table('konteks_operasionals', function (Blueprint $table) {
            $table->dropForeign(['sumber_data_id']);
            $table->foreign('sumber_data_id')
                ->references('id')
                ->on('master_sumber_datas')
                ->restrictOnDelete();

            $table->dropForeign(['opd_id']);
            $table->foreign('opd_id')
                ->references('id')
                ->on('opds')
                ->restrictOnDelete();

            $table->dropForeign(['periode_penilaian_id']);
            $table->foreign('periode_penilaian_id')
                ->references('id')
                ->on('periode_penilaians')
                ->restrictOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. master_sub_unsur_spips
        Schema::table('master_sub_unsur_spips', function (Blueprint $table) {
            $table->dropForeign(['unsur_spip_id']);
            $table->foreign('unsur_spip_id')
                ->references('id')
                ->on('master_unsur_spips')
                ->cascadeOnDelete();
        });

        // 2. tujuan_penilaians
        Schema::table('tujuan_penilaians', function (Blueprint $table) {
            $table->dropForeign(['sumber_data_id']);
            $table->foreign('sumber_data_id')
                ->references('id')
                ->on('master_sumber_datas')
                ->nullOnDelete();

            $table->dropForeign(['opd_id']);
            $table->foreign('opd_id')
                ->references('id')
                ->on('opds')
                ->cascadeOnDelete();

            $table->dropForeign(['periode_penilaian_id']);
            $table->foreign('periode_penilaian_id')
                ->references('id')
                ->on('periode_penilaians')
                ->cascadeOnDelete();
        });

        // 3. sasaran_penilaians
        Schema::table('sasaran_penilaians', function (Blueprint $table) {
            $table->dropForeign(['tujuan_penilaian_id']);
            $table->foreign('tujuan_penilaian_id')
                ->references('id')
                ->on('tujuan_penilaians')
                ->cascadeOnDelete();

            $table->dropForeign(['opd_id']);
            $table->foreign('opd_id')
                ->references('id')
                ->on('opds')
                ->cascadeOnDelete();

            $table->dropForeign(['periode_penilaian_id']);
            $table->foreign('periode_penilaian_id')
                ->references('id')
                ->on('periode_penilaians')
                ->cascadeOnDelete();
        });

        // 4. indikator_penilaians
        Schema::table('indikator_penilaians', function (Blueprint $table) {
            $table->dropForeign(['sasaran_penilaian_id']);
            $table->foreign('sasaran_penilaian_id')
                ->references('id')
                ->on('sasaran_penilaians')
                ->cascadeOnDelete();

            $table->dropForeign(['tujuan_penilaian_id']);
            $table->foreign('tujuan_penilaian_id')
                ->references('id')
                ->on('tujuan_penilaians')
                ->cascadeOnDelete();

            $table->dropForeign(['opd_id']);
            $table->foreign('opd_id')
                ->references('id')
                ->on('opds')
                ->cascadeOnDelete();

            $table->dropForeign(['periode_penilaian_id']);
            $table->foreign('periode_penilaian_id')
                ->references('id')
                ->on('periode_penilaians')
                ->cascadeOnDelete();
        });

        // 5. konteks_penilaians
        Schema::table('konteks_penilaians', function (Blueprint $table) {
            $table->dropForeign(['sumber_data_id']);
            $table->foreign('sumber_data_id')
                ->references('id')
                ->on('master_sumber_datas')
                ->nullOnDelete();

            $table->dropForeign(['tujuan_penilaian_id']);
            $table->foreign('tujuan_penilaian_id')
                ->references('id')
                ->on('tujuan_penilaians')
                ->cascadeOnDelete();

            $table->dropForeign(['opd_id']);
            $table->foreign('opd_id')
                ->references('id')
                ->on('opds')
                ->cascadeOnDelete();

            $table->dropForeign(['periode_penilaian_id']);
            $table->foreign('periode_penilaian_id')
                ->references('id')
                ->on('periode_penilaians')
                ->cascadeOnDelete();
        });

        // 6. konteks_operasionals
        Schema::table('konteks_operasionals', function (Blueprint $table) {
            $table->dropForeign(['sumber_data_id']);
            $table->foreign('sumber_data_id')
                ->references('id')
                ->on('master_sumber_datas')
                ->nullOnDelete();

            $table->dropForeign(['opd_id']);
            $table->foreign('opd_id')
                ->references('id')
                ->on('opds')
                ->cascadeOnDelete();

            $table->dropForeign(['periode_penilaian_id']);
            $table->foreign('periode_penilaian_id')
                ->references('id')
                ->on('periode_penilaians')
                ->cascadeOnDelete();
        });
    }
};
