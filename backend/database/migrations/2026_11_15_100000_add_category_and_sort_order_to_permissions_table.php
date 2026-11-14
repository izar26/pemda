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
        if (Schema::hasTable('permissions')) {
            Schema::table('permissions', function (Blueprint $table) {
                if (! Schema::hasColumn('permissions', 'category')) {
                    $table->string('category', 100)->nullable()->after('group');
                }
                if (! Schema::hasColumn('permissions', 'sort_order')) {
                    $table->unsignedSmallInteger('sort_order')->default(0)->after('category');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('permissions')) {
            Schema::table('permissions', function (Blueprint $table) {
                $columns = [];
                if (Schema::hasColumn('permissions', 'sort_order')) {
                    $columns[] = 'sort_order';
                }
                if (Schema::hasColumn('permissions', 'category')) {
                    $columns[] = 'category';
                }
                if (! empty($columns)) {
                    $table->dropColumn($columns);
                }
            });
        }
    }
};
