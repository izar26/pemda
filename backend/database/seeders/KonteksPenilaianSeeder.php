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
     * Run the database seeds.
     */
    public function run(): void
    {
        $activePeriode = PeriodePenilaian::where('status', 'aktif')->first();
        if (!$activePeriode) {
            return;
        }

        $admin = User::where('email', 'admin@pemda.go.id')->first();
        $adminId = $admin?->id;

        // OPD DPUTR (Dinas Pekerjaan Umum dan Tata Ruang) from Sheet 2B
        $dputr = Opd::where('kode', 'DPUTR')->orWhere('nama', 'ilike', '%Pekerjaan Umum%')->first();
        if (!$dputr) {
            return;
        }

        $sumberData = MasterSumberData::where('nama', 'Renstra SKPD')->first();

        $tujuan = TujuanPenilaian::where('periode_penilaian_id', $activePeriode->id)
            ->where('opd_id', $dputr->id)
            ->where('kode_tujuan', 'TUJ-01')
            ->first();

        if (!$tujuan) {
            return;
        }

        $sasarans = SasaranPenilaian::where('periode_penilaian_id', $activePeriode->id)
            ->where('opd_id', $dputr->id)
            ->whereIn('kode_sasaran', ['SAS-01', 'SAS-02'])
            ->get();

        $indikators = IndikatorPenilaian::where('periode_penilaian_id', $activePeriode->id)
            ->where('opd_id', $dputr->id)
            ->whereIn('kode_indikator', ['IKU-01', 'IKU-02'])
            ->get();

        $konteks = KonteksPenilaian::updateOrCreate(
            [
                'periode_penilaian_id' => $activePeriode->id,
                'opd_id' => $dputr->id,
            ],
            [
                'sumber_data_id' => $sumberData?->id,
                'tujuan_penilaian_id' => $tujuan->id,
                'nama_pemda' => 'Pemerintah Kabupaten Cianjur',
                'informasi_lain' => '-',
                'nama_kepala' => 'ERI RIHANDIAR, S.T., M.T.',
                'nip_kepala' => '19680801 199703 1 005',
                'jabatan_kepala' => 'Kepala Dinas Pekerjaan Umum dan Tata Ruang Kabupaten Cianjur',
                'tanggal_penetapan' => '2027-01-15',
                'status' => 'final',
                'created_by' => $adminId,
                'updated_by' => $adminId,
            ]
        );

        // Sync Sasarans (SAS-01 and SAS-02)
        $sasaranSync = [];
        $urutanSas = 1;
        foreach ($sasarans as $s) {
            $sasaranSync[$s->id] = ['urutan' => $urutanSas++];
        }
        $konteks->sasarans()->sync($sasaranSync);

        // Sync Indikators (IKU-01 and IKU-02)
        $indikatorSync = [];
        $urutanInd = 1;
        foreach ($indikators as $i) {
            $indikatorSync[$i->id] = ['urutan' => $urutanInd++];
        }
        $konteks->indikators()->sync($indikatorSync);
    }
}
