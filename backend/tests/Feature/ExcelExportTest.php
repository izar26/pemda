<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Services\Export\ExcelExportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use ZipArchive;

class ExcelExportTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(\Database\Seeders\RbacSeeder::class);

        $this->admin = User::factory()->create([
            'role' => 'Superadmin',
            'status' => 'active',
        ]);
        $this->admin->assignRole('Superadmin');
    }


    public function test_excel_export_generates_valid_xlsx_with_proper_cols_and_styles(): void
    {
        /** @var ExcelExportService $service */
        $service = app(ExcelExportService::class);

        $headers = ['No', 'Kode Instansi', 'Nama Perangkat Daerah (OPD)', 'Kategori / Jenis', 'Kepala OPD', 'Status'];
        $rows = [
            [1, '1.01.0.00.01', 'Dinas Pendidikan, Kepemudaan, dan Olahraga', 'Dinas Teknis', 'Drs. H. Ahmad Dahlan, M.Pd.', 'Aktif'],
            [2, '1.02.0.00.01', 'Dinas Kesehatan dan Keluarga Berencana', 'Dinas Teknis', 'dr. Hj. Siti Fatimah, Sp.A.', 'Aktif'],
            [3, '1.03.0.00.01', '=cmd|calc.exe!A1', 'Badan Penunjang', 'Ir. Budi Santoso, M.T.', 'Nonaktif'],
        ];

        $tempPath = storage_path('app/test_audit_export.xlsx');
        if (file_exists($tempPath)) {
            unlink($tempPath);
        }

        $rowCount = $service->exportToFile(
            destinationPath: $tempPath,
            title: 'Laporan Rekapitulasi Perangkat Daerah',
            headers: $headers,
            rows: $rows,
            metadata: ['Tahun Anggaran' => '2026', 'Penanggung Jawab' => 'Sekretaris Daerah']
        );

        $this->assertEquals(3, $rowCount);
        $this->assertFileExists($tempPath);

        // Inspect XLSX ZIP contents
        $zip = new ZipArchive();
        $this->assertTrue($zip->open($tempPath));

        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        $this->assertNotEmpty($sheetXml);

        // Verify column widths exist and are custom
        $this->assertStringContainsString('<cols>', $sheetXml);
        $this->assertStringContainsString('customWidth="true"', $sheetXml);

        // Verify cell merging exists for Title and Metadata
        $this->assertStringContainsString('<mergeCells', $sheetXml);
        $this->assertStringContainsString('ref="A1:F1"', $sheetXml); // Title
        $this->assertStringContainsString('ref="A2:F2"', $sheetXml); // Subtitle

        // Verify formula injection neutralization (escaped as &#039; in XML)
        $this->assertStringContainsString("=cmd|calc.exe!A1", $sheetXml);
        $this->assertTrue(
            str_contains($sheetXml, "&#039;=cmd|calc.exe!A1") ||
            str_contains($sheetXml, "'=cmd|calc.exe!A1")
        );

        // Verify borders and styles
        $stylesXml = $zip->getFromName('xl/styles.xml');
        $this->assertStringContainsString('<border', $stylesXml);
        $this->assertStringContainsString('style="thin"', $stylesXml);
        $this->assertStringContainsString('1E3A8A', $stylesXml); // Navy Header

        $zip->close();
        unlink($tempPath);
    }

    public function test_user_export_route_streams_valid_spreadsheet(): void
    {
        $response = $this->actingAs($this->admin)->get('/api/users/export');

        $response->assertStatus(200);
        $this->assertTrue(
            str_contains((string) $response->headers->get('content-type'), 'spreadsheet') ||
            str_contains((string) $response->headers->get('content-disposition'), 'Data_Pegawai_PEMDA')
        );
    }

    public function test_opd_export_route_streams_valid_spreadsheet(): void
    {
        $response = $this->actingAs($this->admin)->get('/api/opds/export');

        $response->assertStatus(200);
        $this->assertTrue(
            str_contains((string) $response->headers->get('content-type'), 'spreadsheet') ||
            str_contains((string) $response->headers->get('content-disposition'), 'Data_Perangkat_Daerah_OPD')
        );
    }

    public function test_dashboard_export_route_streams_valid_spreadsheet(): void
    {
        $response = $this->actingAs($this->admin)->get('/api/dashboard/export');

        $response->assertStatus(200);
        $this->assertTrue(
            str_contains((string) $response->headers->get('content-type'), 'spreadsheet') ||
            str_contains((string) $response->headers->get('content-disposition'), 'Laporan_Ringkasan_Eksekutif_PEMDA')
        );
    }

    public function test_roles_export_route_streams_valid_spreadsheet(): void
    {
        $response = $this->actingAs($this->admin)->get('/api/roles/export');

        $response->assertStatus(200);
        $this->assertTrue(
            str_contains((string) $response->headers->get('content-type'), 'spreadsheet') ||
            str_contains((string) $response->headers->get('content-disposition'), 'Data_Peran_dan_Hak_Akses_PEMDA')
        );
    }

    public function test_audit_logs_export_route_streams_valid_spreadsheet(): void
    {
        $response = $this->actingAs($this->admin)->get('/api/audit-logs/export');

        $response->assertStatus(200);
        $this->assertTrue(
            str_contains((string) $response->headers->get('content-type'), 'spreadsheet') ||
            str_contains((string) $response->headers->get('content-disposition'), 'Log_Audit_Keamanan_PEMDA')
        );
    }

    public function test_master_data_export_route_streams_valid_spreadsheet(): void
    {
        $response = $this->actingAs($this->admin)->get('/api/master/kategori-risiko/export');

        $response->assertStatus(200);
        $this->assertTrue(
            str_contains((string) $response->headers->get('content-type'), 'spreadsheet') ||
            str_contains((string) $response->headers->get('content-disposition'), 'Master_Data_Kategori_Risiko')
        );
    }
}

