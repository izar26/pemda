<?php

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
        Schema::create('audit_log_archives', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('original_audit_id')->nullable()->index();
            $table->foreignUuid('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('user_name', 100)->nullable();
            $table->string('user_nip', 30)->nullable();
            $table->string('user_email', 100)->nullable();
            $table->string('action', 50)->index();
            $table->string('module', 50)->index();
            $table->string('auditable_type', 150)->nullable();
            $table->string('auditable_id', 36)->nullable();
            $table->text('description');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('context')->nullable();
            $table->timestamp('created_at')->index();
            $table->timestamp('archived_at')->useCurrent()->index();
            $table->foreignUuid('archived_by')->nullable()->constrained('users')->nullOnDelete();

            $table->index(['auditable_type', 'auditable_id'], 'audit_archives_auditable_index');
            $table->index(['created_at', 'action'], 'audit_archives_created_action_index');
        });

        // PostgreSQL database-level immutability trigger (WORM - Write Once, Read Many)
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::unprepared(<<<SQL
                CREATE OR REPLACE FUNCTION prevent_audit_archive_tampering()
                RETURNS TRIGGER AS $$
                BEGIN
                    RAISE EXCEPTION 'Pelanggaran Integritas: Catatan pada kubah audit_log_archives bersifat permanen dan dilarang diubah atau dihapus.';
                END;
                $$ LANGUAGE plpgsql;

                DROP TRIGGER IF EXISTS trg_audit_log_archives_immutable ON audit_log_archives;
                CREATE TRIGGER trg_audit_log_archives_immutable
                BEFORE UPDATE OR DELETE ON audit_log_archives
                FOR EACH ROW EXECUTE FUNCTION prevent_audit_archive_tampering();
            SQL);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::connection()->getDriverName() === 'pgsql') {
            DB::unprepared(<<<SQL
                DROP TRIGGER IF EXISTS trg_audit_log_archives_immutable ON audit_log_archives;
                DROP FUNCTION IF EXISTS prevent_audit_archive_tampering();
            SQL);
        }

        Schema::dropIfExists('audit_log_archives');
    }
};
