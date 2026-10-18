<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Master\MasterSumberData;
use App\Models\Opd;
use App\Models\Perencanaan\IndikatorPenilaian;
use App\Models\Perencanaan\PeriodePenilaian;
use App\Models\Perencanaan\SasaranPenilaian;
use App\Models\Perencanaan\TujuanPenilaian;
use App\Models\Risiko\KonteksPenilaian;
use App\Models\User;
use Illuminate\Database\Seeder;

class KonteksPenilaianSeeder extends Seeder
{
    /**
     * Run the database seeds for Form 2B Konteks Risiko Strategis.
     */
    public function run(): void
    {
        $activePeriode = PeriodePenilaian::where('status', 'aktif')->first();
        if (!$activePeriode) {
            return;
        }

        $admin = User::where('email', 'admin@pemda.go.id')->first();
        $adminId = $admin?->id;
        $sumberData = MasterSumberData::where('nama', 'Renstra SKPD')->first();

        $items = [
            [
                'opd_kode' => 'DPUTR',
                'tujuan_kode' => 'TUJ-01',
                'sasaran_kodes' => ['SAS-01', 'SAS-02'],
                'indikator_kodes' => ['IKU-01', 'IKU-02'],
                'status' => 'final',
                'nama_kepala' => 'ERI RIHANDIAR, S.T., M.T.',
                'nip_kepala' => '19680801 199703 1 005',
                'jabatan_kepala' => 'Kepala Dinas Pekerjaan Umum dan Tata Ruang Kabupaten Cianjur',
                'tanggal_penetapan' => '2027-01-15',
            ],
            [
                'opd_kode' => 'Diskominfo',
                'tujuan_kode' => 'TUJ-01',
                'sasaran_kodes' => ['SAS-01', 'SAS-02'],
                'indikator_kodes' => ['IKU-01', 'IKU-02'],
                'status' => 'final',
                'nama_kepala' => 'Dr. H. Cecep Dicky Haryadi, S.H., M.H.',
                'nip_kepala' => '19720415 199803 1 004',
                'jabatan_kepala' => 'Kepala Dinas Komunikasi, Informatika dan Persandian',
                'tanggal_penetapan' => '2027-01-20',
            ],
            [
                'opd_kode' => 'Dinkes',
                'tujuan_kode' => 'TUJ-01',
                'sasaran_kodes' => ['SAS-01', 'SAS-02'],
                'indikator_kodes' => ['IKU-01', 'IKU-02'],
                'status' => 'draft',
                'nama_kepala' => 'dr. H. Irvan Nur Fauzi',
                'nip_kepala' => '19750912 200212 1 003',
                'jabatan_kepala' => 'Kepala Dinas Kesehatan Kabupaten Cianjur',
                'tanggal_penetapan' => '2027-02-01',
            ],
        ];

        foreach ($items as $config) {
            $opd = Opd::where('kode', $config['opd_kode'])
                ->orWhere('nama', 'like', "%{$config['opd_kode']}%")
                ->first();

            if (!$opd) {
                continue;
            }

            $tujuan = TujuanPenilaian::where('periode_penilaian_id', $activePeriode->id)
                ->where('opd_id', $opd->id)
                ->where('kode_tujuan', $config['tujuan_kode'])
                ->first();

            if (!$tujuan) {
                continue;
            }

            $sasarans = SasaranPenilaian::where('periode_penilaian_id', $activePeriode->id)
                ->where('opd_id', $opd->id)
                ->whereIn('kode_sasaran', $config['sasaran_kodes'])
                ->get();

            $indikators = IndikatorPenilaian::where('periode_penilaian_id', $activePeriode->id)
                ->where('opd_id', $opd->id)
                ->whereIn('kode_indikator', $config['indikator_kodes'])
                ->get();

            $konteks = KonteksPenilaian::updateOrCreate(
                [
                    'periode_penilaian_id' => $activePeriode->id,
                    'opd_id' => $opd->id,
                ],
                [
                    'sumber_data_id' => $sumberData?->id,
                    'tujuan_penilaian_id' => $tujuan->id,
                    'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
                    'informasi_lain' => '-',
                    'nama_kepala' => $config['nama_kepala'],
                    'nip_kepala' => $config['nip_kepala'],
                    'jabatan_kepala' => $config['jabatan_kepala'],
                    'tanggal_penetapan' => $config['tanggal_penetapan'],
                    'status' => $config['status'],
                    'created_by' => $adminId,
                    'updated_by' => $adminId,
                ]
            );

            // Sync Sasarans
            $sasaranSync = [];
            $uSas = 1;
            foreach ($sasarans as $s) {
                $sasaranSync[$s->id] = ['urutan' => $uSas++];
            }
            $konteks->sasarans()->sync($sasaranSync);

            // Sync Indikators
            $indSync = [];
            $uInd = 1;
            foreach ($indikators as $i) {
                $indSync[$i->id] = ['urutan' => $uInd++];
            }
            $konteks->indikators()->sync($indSync);
        }
    }
}
