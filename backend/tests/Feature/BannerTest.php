<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Banner;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BannerTest extends TestCase
{
    use RefreshDatabase;

    protected User $superadmin;
    protected User $staffWithoutPerm;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RbacSeeder::class);

        $this->superadmin = User::factory()->create([
            'email' => 'admin@pemda.go.id',
            'status' => 'active',
        ]);
        $this->superadmin->assignRole('Superadmin');

        $this->staffWithoutPerm = User::factory()->create([
            'email' => 'staff@pemda.go.id',
            'status' => 'active',
        ]);
        $staffRole = Role::firstOrCreate(
            ['name' => 'Staff', 'guard_name' => 'web'],
            ['is_system' => false]
        );
        $staffRole->syncPermissions(['users.view']);
        $this->staffWithoutPerm->assignRole('Staff');
    }

    public function test_public_can_fetch_active_banners_only(): void
    {
        Banner::factory()->create([
            'title' => 'Banner Aktif',
            'placement' => 'login',
            'is_active' => true,
            'order' => 1,
            'image_path' => 'banners/login/active.webp',
        ]);

        Banner::factory()->create([
            'title' => 'Banner Nonaktif',
            'placement' => 'login',
            'is_active' => false,
            'order' => 2,
            'image_path' => 'banners/login/inactive.webp',
        ]);

        $response = $this->getJson('/api/content/banners/public?placement=login');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Banner Aktif');
    }

    public function test_unauthorized_user_cannot_access_banner_cms(): void
    {
        Sanctum::actingAs($this->staffWithoutPerm, ['*']);

        $response = $this->getJson('/api/content/banners');
        $response->assertForbidden();
    }

    public function test_superadmin_can_upload_and_create_banner(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->superadmin, ['*']);

        $file = UploadedFile::fake()->image('hero.png', 1200, 800);

        $response = $this->postJson('/api/content/banners', [
            'title' => 'Selamat Datang',
            'description' => 'Portal Aplikasi ManRis PEMDA',
            'placement' => 'login',
            'image' => $file,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.title', 'Selamat Datang')
            ->assertJsonPath('data.placement', 'login');

        $this->assertDatabaseHas('banners', [
            'title' => 'Selamat Datang',
            'placement' => 'login',
            'is_active' => true,
        ]);

        $banner = Banner::first();
        $this->assertNotNull($banner);
        $this->assertStringEndsWith('.webp', $banner->image_path);
        Storage::disk('public')->assertExists($banner->image_path);
    }

    public function test_superadmin_can_toggle_banner_status(): void
    {
        Sanctum::actingAs($this->superadmin, ['*']);

        $banner = Banner::factory()->create([
            'placement' => 'login',
            'is_active' => true,
            'image_path' => 'banners/login/test.webp',
        ]);

        $response = $this->patchJson("/api/content/banners/{$banner->id}/toggle-active");

        $response->assertOk()
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('banners', [
            'id' => $banner->id,
            'is_active' => false,
        ]);
    }

    public function test_superadmin_can_reorder_banners(): void
    {
        Sanctum::actingAs($this->superadmin, ['*']);

        $banner1 = Banner::factory()->create(['order' => 1, 'image_path' => 'b1.webp']);
        $banner2 = Banner::factory()->create(['order' => 2, 'image_path' => 'b2.webp']);

        $response = $this->postJson('/api/content/banners/reorder', [
            'banner_ids' => [$banner2->id, $banner1->id],
        ]);

        $response->assertOk();

        $this->assertEquals(1, $banner2->fresh()->order);
        $this->assertEquals(2, $banner1->fresh()->order);
    }

    public function test_superadmin_can_delete_banner(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->superadmin, ['*']);

        Storage::disk('public')->put('banners/login/to_delete.webp', 'fake-image-content');

        $banner = Banner::factory()->create([
            'image_path' => 'banners/login/to_delete.webp',
        ]);

        $response = $this->deleteJson("/api/content/banners/{$banner->id}");
        $response->assertOk();

        $this->assertDatabaseMissing('banners', ['id' => $banner->id]);
        Storage::disk('public')->assertMissing('banners/login/to_delete.webp');
    }
}
