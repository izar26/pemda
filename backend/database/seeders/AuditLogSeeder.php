<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AuditLogSeeder extends Seeder
{
    /**
     * Run the database seeds for audit logs and login history.
     */
    public function run(): void
    {
        $admin = User::where('email', 'administrator@pemda.go.id')->first() ?? User::where('email', 'admin@pemda.go.id')->first();
        $adminOffice = User::where('email', 'admin@pemda.go.id')->first();
        $bapperida = User::where('email', 'bapperida@pemda.go.id')->first();
        $opdDputr = User::where('email', 'opputr@pemda.go.id')->first();
        $inspektorat = User::where('email', 'pengawas@pemda.go.id')->first();
        $auditor = User::where('email', 'auditor@pemda.go.id')->first();

        $now = Carbon::now();

        $logs = [
            [
                'user' => $admin,
                'action' => 'SYSTEM_INIT',
                'module' => 'Pengaturan Sistem',
                'description' => 'Inisialisasi sistem portal manajemen risiko dan migrasi basis data terpusat.',
                'ip' => '127.0.0.1',
                'context' => ['status' => 'success', 'environment' => 'production'],
                'time' => $now->copy()->subDays(6)->setHour(8)->setMinute(15),
            ],
            [
                'user' => $admin,
                'action' => 'LOGIN',
                'module' => 'Autentikasi',
                'description' => 'Berhasil masuk ke portal sistem melalui autentikasi kredensial resmi.',
                'ip' => '192.168.1.10',
                'context' => ['method' => 'web_credentials'],
                'time' => $now->copy()->subDays(6)->setHour(8)->setMinute(20),
            ],
            [
                'user' => $admin,
                'action' => 'ASSIGN_ROLE',
                'module' => 'Peran & Izin',
                'description' => 'Menetapkan peran Admin kepada pengguna Admin.',
                'ip' => '192.168.1.10',
                'context' => ['target_role' => 'Admin', 'target_user' => 'admin@pemda.go.id'],
                'time' => $now->copy()->subDays(6)->setHour(9)->setMinute(10),
            ],
            [
                'user' => $adminOffice,
                'action' => 'LOGIN',
                'module' => 'Autentikasi',
                'description' => 'Berhasil masuk ke portal sistem melalui autentikasi kredensial resmi.',
                'ip' => '192.168.1.15',
                'context' => ['method' => 'web_credentials'],
                'time' => $now->copy()->subDays(5)->setHour(8)->setMinute(30),
            ],
            [
                'user' => $adminOffice,
                'action' => 'CREATE_PEGAWAI',
                'module' => 'Manajemen Pegawai',
                'description' => 'Menambahkan data ASN baru atas nama dr. H. Irvan Nur Fauzi (Dinas Kesehatan).',
                'ip' => '192.168.1.15',
                'context' => ['nip' => '197509122002121003', 'jabatan' => 'Kepala OPD'],
                'time' => $now->copy()->subDays(5)->setHour(9)->setMinute(45),
            ],
            [
                'user' => $adminOffice,
                'action' => 'CREATE_USER',
                'module' => 'Manajemen Users',
                'description' => 'Membuat akun akses login dan menetapkan peran Operator OPD untuk OP Putr.',
                'ip' => '192.168.1.15',
                'context' => ['email' => 'opputr@pemda.go.id', 'role' => 'Operator OPD'],
                'time' => $now->copy()->subDays(5)->setHour(10)->setMinute(20),
            ],
            [
                'user' => $bapperida,
                'action' => 'LOGIN',
                'module' => 'Autentikasi',
                'description' => 'Berhasil masuk ke portal sistem melalui autentikasi kredensial resmi.',
                'ip' => '10.10.2.25',
                'context' => ['method' => 'web_credentials'],
                'time' => $now->copy()->subDays(4)->setHour(8)->setMinute(10),
            ],
            [
                'user' => $bapperida,
                'action' => 'ACTIVATE_PERIODE',
                'module' => 'Periode Penilaian',
                'description' => 'Mengaktifkan siklus periode penilaian RPJMD 2026 - 2030 (Tahun Penilaian 2028).',
                'ip' => '10.10.2.25',
                'context' => ['tahun_mulai' => 2026, 'tahun_akhir' => 2030, 'tahun_penilaian' => 2028],
                'time' => $now->copy()->subDays(4)->setHour(8)->setMinute(45),
            ],
            [
                'user' => $bapperida,
                'action' => 'CREATE_TUJUAN',
                'module' => 'Tujuan, Sasaran & Indikator',
                'description' => 'Menambahkan Tujuan Renstra TUJ-01 untuk Dinas Pekerjaan Umum dan Tata Ruang.',
                'ip' => '10.10.2.25',
                'context' => ['opd' => 'DPUTR', 'kode_tujuan' => 'TUJ-01'],
                'time' => $now->copy()->subDays(4)->setHour(9)->setMinute(30),
            ],
            [
                'user' => $bapperida,
                'action' => 'CREATE_IKU',
                'module' => 'Tujuan, Sasaran & Indikator',
                'description' => 'Menambahkan Indikator Kinerja Utama IKU-01 Kemantapan Jalan Kabupaten.',
                'ip' => '10.10.2.25',
                'context' => ['opd' => 'DPUTR', 'kode_indikator' => 'IKU-01'],
                'time' => $now->copy()->subDays(4)->setHour(10)->setMinute(15),
            ],
            [
                'user' => $opdDputr,
                'action' => 'LOGIN',
                'module' => 'Autentikasi',
                'description' => 'Berhasil masuk ke portal sistem melalui autentikasi kredensial resmi.',
                'ip' => '10.10.3.12',
                'context' => ['method' => 'web_credentials'],
                'time' => $now->copy()->subDays(3)->setHour(9)->setMinute(0),
            ],
            [
                'user' => $opdDputr,
                'action' => 'SUBMIT_FORM_2B',
                'module' => 'Konteks Strategis (2B)',
                'description' => 'Menyimpan draf penetapan konteks risiko strategis Form 2B DPUTR tahun penilaian 2028.',
                'ip' => '10.10.3.12',
                'context' => ['opd' => 'DPUTR', 'status' => 'draft'],
                'time' => $now->copy()->subDays(3)->setHour(10)->setMinute(30),
            ],
            [
                'user' => $opdDputr,
                'action' => 'FINALIZE_FORM_2B',
                'module' => 'Konteks Strategis (2B)',
                'description' => 'Memfinalisasi formulir penetapan konteks risiko strategis 2B DPUTR dengan pengesahan Kepala Dinas.',
                'ip' => '10.10.3.12',
                'context' => ['opd' => 'DPUTR', 'status' => 'final', 'kepala' => 'ERI RIHANDIAR, S.T., M.T.'],
                'time' => $now->copy()->subDays(3)->setHour(11)->setMinute(45),
            ],
            [
                'user' => $opdDputr,
                'action' => 'TREE_SYNC_2C',
                'module' => 'Konteks Operasional (2C)',
                'description' => 'Menyusun hierarki Program, Kegiatan, dan Subkegiatan operasional Form 2C DPUTR.',
                'ip' => '10.10.3.12',
                'context' => ['opd' => 'DPUTR', 'total_items' => 18],
                'time' => $now->copy()->subDays(2)->setHour(13)->setMinute(20),
            ],
            [
                'user' => $opdDputr,
                'action' => 'EXPORT_FORM_2B',
                'module' => 'Konteks Strategis (2B)',
                'description' => 'Mengekspor berkas Excel penetapan konteks risiko strategis Formulir 2B.',
                'ip' => '10.10.3.12',
                'context' => ['format' => 'xlsx', 'opd' => 'DPUTR'],
                'time' => $now->copy()->subDays(2)->setHour(15)->setMinute(10),
            ],
            [
                'user' => $inspektorat,
                'action' => 'LOGIN',
                'module' => 'Autentikasi',
                'description' => 'Berhasil masuk ke portal sistem melalui autentikasi kredensial resmi.',
                'ip' => '10.10.5.8',
                'context' => ['method' => 'web_credentials'],
                'time' => $now->copy()->subDays(1)->setHour(8)->setMinute(25),
            ],
            [
                'user' => $inspektorat,
                'action' => 'AUDIT_VIEW_2B',
                'module' => 'Konteks Strategis (2B)',
                'description' => 'Menelaah berkas Form 2B DPUTR untuk verifikasi keselarasan IKU terhadap Renstra SKPD.',
                'ip' => '10.10.5.8',
                'context' => ['target_opd' => 'DPUTR', 'review_status' => 'verified'],
                'time' => $now->copy()->subDays(1)->setHour(9)->setMinute(15),
            ],
            [
                'user' => $auditor,
                'action' => 'LOGIN',
                'module' => 'Autentikasi',
                'description' => 'Berhasil masuk ke portal sistem melalui autentikasi kredensial resmi.',
                'ip' => '10.10.5.14',
                'context' => ['method' => 'web_credentials'],
                'time' => $now->copy()->subHours(6),
            ],
            [
                'user' => $auditor,
                'action' => 'EXPORT_LOG',
                'module' => 'Log Audit Keamanan',
                'description' => 'Mengekspor rekapitulasi log audit aktivitas dan keamanan sistem ke Excel.',
                'ip' => '10.10.5.14',
                'context' => ['filter' => 'all', 'format' => 'xlsx'],
                'time' => $now->copy()->subHours(5),
            ],
            [
                'user' => $admin,
                'action' => 'UPDATE_SETTINGS',
                'module' => 'Pengaturan Sistem',
                'description' => 'Memperbarui parameter keamanan: wajibkan 2FA untuk peran administratif.',
                'ip' => '192.168.1.10',
                'context' => ['require_2fa_for_admin' => '1', 'session_lifetime' => 60],
                'time' => $now->copy()->subHours(2),
            ],
        ];

        foreach ($logs as $item) {
            $u = $item['user'];
            AuditLog::create([
                'user_id' => $u?->id,
                'user_name' => $u?->name ?? 'Administrator',
                'user_nip' => $u?->nip ?? '202601012020121001',
                'user_email' => $u?->email ?? 'administrator@pemda.go.id',
                'action' => $item['action'],
                'module' => $item['module'],
                'description' => $item['description'],
                'ip_address' => $item['ip'],
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'context' => $item['context'],
                'created_at' => $item['time'],
            ]);

            // If action is LOGIN, also record in LoginLog
            if ($item['action'] === 'LOGIN') {
                LoginLog::create([
                    'user_id' => $u?->id,
                    'identifier' => $u?->email ?? 'administrator@pemda.go.id',
                    'ip_address' => $item['ip'],
                    'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
                    'status' => 'success',
                    'details' => 'Otentikasi kredensial berhasil',
                    'created_at' => $item['time'],
                ]);
            }
        }

        // Add 2 realistic failed login attempts
        LoginLog::create([
            'user_id' => null,
            'identifier' => 'unknown.user@pemda.go.id',
            'ip_address' => '203.0.113.42',
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'status' => 'failed',
            'details' => 'Identitas akun tidak ditemukan dalam pangkalan data',
            'created_at' => $now->copy()->subHours(4),
        ]);

        LoginLog::create([
            'user_id' => $opdDputr?->id,
            'identifier' => $opdDputr?->email ?? 'opputr@pemda.go.id',
            'ip_address' => '10.10.3.12',
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'status' => 'failed',
            'details' => 'Kata sandi tidak sesuai',
            'created_at' => $now->copy()->subHours(3),
        ]);
    }
}
