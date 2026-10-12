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
        Schema::create('sasaran_penilaians', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('periode_penilaian_id')
                ->constrained('periode_penilaians')
                ->cascadeOnDelete();
            $table->foreignUuid('tujuan_penilaian_id')
                ->constrained('tujuan_penilaians')
                ->cascadeOnDelete();
            $table->foreignUuid('opd_id')
                ->constrained('opds')
                ->cascadeOnDelete();

            $table->string('kode_sasaran', 50)->nullable();
            $table->text('sasaran');
            $table->unsignedInteger('urutan')->default(1);
            $table->text('keterangan')->nullable();

            $table->foreignUuid('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();

            // Indexes for fast relational querying & sorting
            $table->index(['periode_penilaian_id', 'opd_id']);
            $table->index('tujuan_penilaian_id');
            $table->index('urutan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sasaran_penilaians');
    }
};
