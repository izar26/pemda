<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Opd;
use Illuminate\Database\Seeder;

class OpdSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $opdData = [
            // Sekretariat & Inspektorat
            ['nama' => 'Sekretariat Daerah', 'kode' => 'Sekda', 'kategori' => 'Sekretariat'],
            ['nama' => 'Sekretariat DPRD', 'kode' => 'Setwan', 'kategori' => 'Sekretariat'],
            ['nama' => 'Inspektorat Daerah', 'kode' => 'Itda', 'kategori' => 'Inspektorat'],

            // Dinas
            ['nama' => 'Dinas Pendidikan, Pemuda dan Olahraga', 'kode' => 'Disdik', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Kesehatan', 'kode' => 'Dinkes', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Pekerjaan Umum dan Tata Ruang', 'kode' => 'DPUTR', 'kategori' => 'Dinas'],
            ['nama' => 'Satuan Polisi Pamong Praja dan Pemadam Kebakaran', 'kode' => 'Satpol PPPK', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Sosial', 'kode' => 'Dinsos', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Kebudayaan dan Pariwisata', 'kode' => 'Disbudpar', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Tanaman Pangan, Hortikultura, Perkebunan dan Ketahanan Pangan', 'kode' => 'DTPHPKP', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Peternakan, Kesehatan Hewan dan Perikanan', 'kode' => 'DPHP', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Pengendalian Penduduk, Keluarga Berencana, Pemberdayaan Perempuan dan Perlindungan Anak', 'kode' => 'DPPKBP3A', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Kependudukan dan Pencatatan Sipil', 'kode' => 'Disdukcapil', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Pemberdayaan Masyarakat dan Desa', 'kode' => 'DPMD', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu', 'kode' => 'DPMPTSP', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Koperasi, Usaha Kecil, Menengah, Perdagangan dan Perindustrian', 'kode' => 'Diskoperdagin', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Tenaga Kerja dan Transmigrasi', 'kode' => 'Disnakertrans', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Komunikasi, Informatika dan Persandian', 'kode' => 'Diskominfo', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Perhubungan', 'kode' => 'Dishub', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Lingkungan Hidup', 'kode' => 'DLH', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Arsip dan Perpustakaan', 'kode' => 'Disarpus', 'kategori' => 'Dinas'],
            ['nama' => 'Dinas Perumahan dan Kawasan Permukiman', 'kode' => 'DPKP', 'kategori' => 'Dinas'],

            // Badan
            ['nama' => 'Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah', 'kode' => 'Bapperida', 'kategori' => 'Badan'],
            ['nama' => 'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia', 'kode' => 'BKPSDM', 'kategori' => 'Badan'],
            ['nama' => 'Badan Keuangan dan Aset Daerah', 'kode' => 'BKAD', 'kategori' => 'Badan'],
            ['nama' => 'Badan Pendapatan Daerah', 'kode' => 'Bapenda', 'kategori' => 'Badan'],
            ['nama' => 'Badan Kesatuan Bangsa dan Politik', 'kode' => 'Kesbangpol', 'kategori' => 'Badan'],
            ['nama' => 'Badan Penanggulangan Bencana Daerah', 'kode' => 'BPBD', 'kategori' => 'Badan'],

            // RSUD
            ['nama' => 'RSUD Sayang', 'kode' => 'RSUD-Syg', 'kategori' => 'RSUD'],
            ['nama' => 'RSUD Cimacan', 'kode' => 'RSUD-Cmn', 'kategori' => 'RSUD'],
            ['nama' => 'RSUD Pagelaran', 'kode' => 'RSUD-Pgl', 'kategori' => 'RSUD'],

            // Kecamatan (32 Kecamatan)
            ['nama' => 'Kecamatan Agrabinta', 'kode' => 'KEC-AGRABINTA', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Bojongpicung', 'kode' => 'KEC-BOJONGPICUNG', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Campaka', 'kode' => 'KEC-CAMPAKA', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Campaka Mulya', 'kode' => 'KEC-CAMPAKAMULYA', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Cianjur', 'kode' => 'KEC-CIANJUR', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Cibeber', 'kode' => 'KEC-CIBEBER', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Cibinong', 'kode' => 'KEC-CIBINONG', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Cidaun', 'kode' => 'KEC-CIDAUN', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Cijati', 'kode' => 'KEC-CIJATI', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Cikadu', 'kode' => 'KEC-CIKADU', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Cikalongkulon', 'kode' => 'KEC-CIKALONGKULON', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Cilaku', 'kode' => 'KEC-CILAKU', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Cipanas', 'kode' => 'KEC-CIPANAS', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Ciranjang', 'kode' => 'KEC-CIRANJANG', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Cugenang', 'kode' => 'KEC-CUGENANG', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Gekbrong', 'kode' => 'KEC-GEKBRONG', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Haurwangi', 'kode' => 'KEC-HAURWANGI', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Kadupandak', 'kode' => 'KEC-KADUPANDAK', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Karangtengah', 'kode' => 'KEC-KARANGTENGAH', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Leles', 'kode' => 'KEC-LELES', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Mande', 'kode' => 'KEC-MANDE', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Naringgul', 'kode' => 'KEC-NARINGGUL', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Pacet', 'kode' => 'KEC-PACET', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Pagelaran', 'kode' => 'KEC-PAGELARAN', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Pasirkuda', 'kode' => 'KEC-PASIRKUDA', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Sindangbarang', 'kode' => 'KEC-SINDANGBARANG', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Sukaluyu', 'kode' => 'KEC-SUKALUYU', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Sukanagara', 'kode' => 'KEC-SUKANAGARA', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Sukaresmi', 'kode' => 'KEC-SUKARESMI', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Takokak', 'kode' => 'KEC-TAKOKAK', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Tanggeung', 'kode' => 'KEC-TANGGEUNG', 'kategori' => 'Kecamatan'],
            ['nama' => 'Kecamatan Warungkondang', 'kode' => 'KEC-WARUNGKONDANG', 'kategori' => 'Kecamatan'],
        ];

        foreach ($opdData as $idx => $item) {
            Opd::updateOrCreate(
                ['kode' => $item['kode']],
                [
                    'nama' => $item['nama'],
                    'kategori' => $item['kategori'],
                    'urutan' => $idx + 1,
                    'is_active' => true,
                ]
            );
        }
    }
}
