<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Opd;
use Database\Seeders\OpdSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OpdTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(OpdSeeder::class);
    }

    public function test_can_list_all_active_opds(): void
    {
        $response = $this->getJson('/api/opds');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'nama',
                        'kode',
                        'kategori',
                        'is_active',
                    ],
                ],
            ]);

        // Total seeded is 63 OPDs
        $this->assertGreaterThanOrEqual(63, count($response->json('data')));
    }

    public function test_can_filter_opds_by_kategori(): void
    {
        $response = $this->getJson('/api/opds?kategori=Kecamatan');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data);
        foreach ($data as $opd) {
            $this->assertEquals('Kecamatan', $opd['kategori']);
        }
    }

    public function test_can_search_opds_by_name(): void
    {
        $response = $this->getJson('/api/opds?search=Komunikasi');

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertNotEmpty($data);
        $this->assertStringContainsString('Komunikasi', $data[0]['nama']);
    }

    public function test_can_get_single_opd(): void
    {
        $opd = Opd::first();
        $this->assertNotNull($opd);

        $response = $this->getJson('/api/opds/' . $opd->id);

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $opd->id)
            ->assertJsonPath('data.nama', $opd->nama);
    }
}
