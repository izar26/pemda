<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Opd;
use App\Models\User;
use Illuminate\Database\Seeder;

class PegawaiSeeder extends Seeder
{
    /**
     * Run the database seeds for ASN Pegawai directory.
     */
    public function run(): void
    {
        $opds = Opd::all()->keyBy('kode');

        $obsoleteEmails = [
            'admin.office@pemda.go.id',
            'opd.dputr@pemda.go.id',
            'opd.dinkes@pemda.go.id',
            'opd.disdik@pemda.go.id',
            'opd.diskominfo@pemda.go.id',
            'bupati@pemda.go.id',
            'inspektorat@pemda.go.id',
        ];
        User::whereIn('email', $obsoleteEmails)->delete();

        $dataset = [
            'Sekda' => [
                [
                    'name' => 'Drs. H. Cecep S. Alamsyah, M.Si.',
                    'nip' => '196805141994031003',
                    'email' => 'cecep.alamsyah@pemda.go.id',
                    'phone' => '081220010001',
                    'jabatan' => 'Kepala OPD',
                    'pangkat_gol' => 'Pembina Utama Madya (IV/d)',
                ],
                [
                    'name' => 'Ahmad Fauzi, S.STP, M.Si.',
                    'nip' => '198604122006021002',
                    'email' => 'ahmad.fauzi@pemda.go.id',
                    'phone' => '081220010002',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Tingkat I (III/d)',
                ],
            ],
            'Itda' => [
                [
                    'name' => 'Endang Suhendar, S.H., M.M.',
                    'nip' => '196911201994031005',
                    'email' => 'endang.suhendar@pemda.go.id',
                    'phone' => '081220070001',
                    'jabatan' => 'Kepala OPD',
                    'pangkat_gol' => 'Pembina Utama Muda (IV/c)',
                ],
                // 1. Administrator (Role: Superadmin)
                [
                    'name' => 'Administrator',
                    'nip' => '202601012020121001',
                    'email' => 'administrator@pemda.go.id',
                    'phone' => '087788990011',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda (III/a)',
                ],
                // 2. Admin (Role: Admin / Admin Office)
                [
                    'name' => 'Admin',
                    'nip' => '202601012020121002',
                    'email' => 'admin@pemda.go.id',
                    'phone' => '087788990012',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda (III/a)',
                ],
                // 4. Pengawas (Role: Pengawas / Inspektorat)
                [
                    'name' => 'Pengawas',
                    'nip' => '202601012020121004',
                    'email' => 'pengawas@pemda.go.id',
                    'phone' => '087788990014',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda (III/a)',
                ],
                // 5. Auditor (Role: Auditor)
                [
                    'name' => 'Auditor',
                    'nip' => '202601012020121005',
                    'email' => 'auditor@pemda.go.id',
                    'phone' => '087788990015',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda (III/a)',
                ],
                // 8. Pengawas2 (Role: Pengawas / Inspektorat)
                [
                    'name' => 'Pengawas2',
                    'nip' => '202601012020121008',
                    'email' => 'pengawas2@pemda.go.id',
                    'phone' => '087788990018',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda (III/a)',
                ],
                // 9. Auditor2 (Role: Auditor)
                [
                    'name' => 'Auditor2',
                    'nip' => '202601012020121009',
                    'email' => 'auditor2@pemda.go.id',
                    'phone' => '087788990019',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda (III/a)',
                ],
            ],
            'Bapperida' => [
                [
                    'name' => 'Dr. Dadan Ginanjar, S.IP., M.Si.',
                    'nip' => '197306221998031006',
                    'email' => 'dadan.ginanjar@pemda.go.id',
                    'phone' => '081220060001',
                    'jabatan' => 'Kepala OPD',
                    'pangkat_gol' => 'Pembina Utama Muda (IV/c)',
                ],
                // 3. Bapperida (Role: Bapperida)
                [
                    'name' => 'Bapperida',
                    'nip' => '202601012020121003',
                    'email' => 'bapperida@pemda.go.id',
                    'phone' => '087788990013',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda (III/a)',
                ],
                // 7. Bapperida2 (Role: Bapperida)
                [
                    'name' => 'Bapperida2',
                    'nip' => '202601012020121007',
                    'email' => 'bapperida2@pemda.go.id',
                    'phone' => '087788990017',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda (III/a)',
                ],
                [
                    'name' => 'Nita Permatasari, S.E., M.E.',
                    'nip' => '198904202012012004',
                    'email' => 'nita.permatasari@pemda.go.id',
                    'phone' => '081220060003',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda Tingkat I (III/b)',
                ],
            ],
            'DPUTR' => [
                [
                    'name' => 'ERI RIHANDIAR, S.T., M.T.',
                    'nip' => '196808011997031005',
                    'email' => 'eri.rihandiar@pemda.go.id',
                    'phone' => '081220020001',
                    'jabatan' => 'Kepala OPD',
                    'pangkat_gol' => 'Pembina Utama Muda (IV/c)',
                ],
                [
                    'name' => 'Ir. Budi Santoso, M.Eng.',
                    'nip' => '197403152000031004',
                    'email' => 'budi.santoso@pemda.go.id',
                    'phone' => '081220020002',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Pembina (IV/a)',
                ],
                [
                    'name' => 'Dedi Supriadi, S.T.',
                    'nip' => '198210052008011008',
                    'email' => 'dedi.supriadi@pemda.go.id',
                    'phone' => '081220020003',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Tingkat I (III/d)',
                ],
                [
                    'name' => 'Siti Rahmawati, S.T., M.T.',
                    'nip' => '198507202009022003',
                    'email' => 'siti.rahmawati@pemda.go.id',
                    'phone' => '081220020004',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata (III/c)',
                ],
                // 6. OP Putr (Role: Operator OPD)
                [
                    'name' => 'OP Putr',
                    'nip' => '202601012020121006',
                    'email' => 'opputr@pemda.go.id',
                    'phone' => '087788990016',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda (III/a)',
                ],
            ],
            'DPKP' => [
                [
                    'name' => 'H. Cepi Rahmat F., S.T., M.T.',
                    'nip' => '197103121997031004',
                    'email' => 'cepi.rahmat@pemda.go.id',
                    'phone' => '081220110001',
                    'jabatan' => 'Kepala OPD',
                    'pangkat_gol' => 'Pembina Utama Muda (IV/c)',
                ],
                // 10. OP Perkim (Role: Operator OPD)
                [
                    'name' => 'OP Perkim',
                    'nip' => '202601012020121010',
                    'email' => 'opperkim@pemda.go.id',
                    'phone' => '087788990020',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda (III/a)',
                ],
            ],
            'Dinkes' => [
                [
                    'name' => 'dr. H. Irvan Nur Fauzi',
                    'nip' => '197509122002121003',
                    'email' => 'irvan.fauzi@pemda.go.id',
                    'phone' => '081220030001',
                    'jabatan' => 'Kepala OPD',
                    'pangkat_gol' => 'Pembina Tingkat I (IV/b)',
                ],
                [
                    'name' => 'dr. Hj. Yusmaniar, M.Kes.',
                    'nip' => '197708242005012006',
                    'email' => 'yusmaniar@pemda.go.id',
                    'phone' => '081220030002',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Pembina (IV/a)',
                ],
                [
                    'name' => 'dr. Deni Rustandi',
                    'nip' => '198302182009031002',
                    'email' => 'deni.rustandi@pemda.go.id',
                    'phone' => '081220030003',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Tingkat I (III/d)',
                ],
                [
                    'name' => 'Rina Marlina, SKM, M.KM.',
                    'nip' => '198906152014022001',
                    'email' => 'rina.marlina@pemda.go.id',
                    'phone' => '081220030004',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda Tingkat I (III/b)',
                ],
            ],
            'Disdik' => [
                [
                    'name' => 'Ruhli Solehudin, S.Ag., M.Si.',
                    'nip' => '197003101995031002',
                    'email' => 'ruhli.solehudin@pemda.go.id',
                    'phone' => '081220040001',
                    'jabatan' => 'Kepala OPD',
                    'pangkat_gol' => 'Pembina Utama Muda (IV/c)',
                ],
                [
                    'name' => 'Drs. H. Asep Saepurohman, M.Pd.',
                    'nip' => '197205181998021003',
                    'email' => 'asep.saepurohman@pemda.go.id',
                    'phone' => '081220040002',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Pembina (IV/a)',
                ],
                [
                    'name' => 'Wawan Setiawan, S.Pd., M.M.',
                    'nip' => '197809142003121005',
                    'email' => 'wawan.setiawan@pemda.go.id',
                    'phone' => '081220040003',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Tingkat I (III/d)',
                ],
                [
                    'name' => 'Dewi Sartika, S.Pd.',
                    'nip' => '199102282015032002',
                    'email' => 'dewi.sartika@pemda.go.id',
                    'phone' => '081220040004',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda (III/a)',
                ],
            ],
            'Diskominfo' => [
                [
                    'name' => 'Dr. H. Cecep Dicky Haryadi, S.H., M.H.',
                    'nip' => '197204151998031004',
                    'email' => 'cecep.dicky@pemda.go.id',
                    'phone' => '081220050001',
                    'jabatan' => 'Kepala OPD',
                    'pangkat_gol' => 'Pembina Utama Muda (IV/c)',
                ],
                [
                    'name' => 'Gilar Ginanjar, S.Kom., M.Kom.',
                    'nip' => '198205162006041011',
                    'email' => 'gilar.ginanjar@pemda.go.id',
                    'phone' => '081220050002',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Pembina (IV/a)',
                ],
                [
                    'name' => 'Yudi Pratama, S.Kom.',
                    'nip' => '198709232010011007',
                    'email' => 'yudi.pratama@pemda.go.id',
                    'phone' => '081220050003',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata (III/c)',
                ],
                [
                    'name' => 'Maya Anggraeni, S.I.Kom.',
                    'nip' => '199208142016022001',
                    'email' => 'maya.anggraeni@pemda.go.id',
                    'phone' => '081220050004',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda (III/a)',
                ],
            ],
            'BKAD' => [
                [
                    'name' => 'Drs. Ahmad Danial, M.Si.',
                    'nip' => '197107141996031002',
                    'email' => 'ahmad.danial@pemda.go.id',
                    'phone' => '081220080001',
                    'jabatan' => 'Kepala OPD',
                    'pangkat_gol' => 'Pembina Utama Muda (IV/c)',
                ],
                [
                    'name' => 'Sri Wahyuni, S.E., M.Ak.',
                    'nip' => '198511252009022003',
                    'email' => 'sri.wahyuni@pemda.go.id',
                    'phone' => '081220080002',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata (III/c)',
                ],
            ],
            'DLH' => [
                [
                    'name' => 'Ir. Komarudin, M.Si.',
                    'nip' => '197008191997031004',
                    'email' => 'komarudin@pemda.go.id',
                    'phone' => '081220090001',
                    'jabatan' => 'Kepala OPD',
                    'pangkat_gol' => 'Pembina Utama Muda (IV/c)',
                ],
                [
                    'name' => 'Arif Rahman, S.Si., M.Ling.',
                    'nip' => '198801122011011003',
                    'email' => 'arif.rahman@pemda.go.id',
                    'phone' => '081220090002',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata Muda Tingkat I (III/b)',
                ],
            ],
            'RSUD-Syg' => [
                [
                    'name' => 'dr. Hj. Dharmawan, Sp.PK., M.Kes.',
                    'nip' => '197305102001122001',
                    'email' => 'direktur.rsudsyg@pemda.go.id',
                    'phone' => '081220100001',
                    'jabatan' => 'Kepala OPD',
                    'pangkat_gol' => 'Pembina Tingkat I (IV/b)',
                ],
                [
                    'name' => 'dr. Anita Wijaya',
                    'nip' => '198609042011012008',
                    'email' => 'anita.wijaya@pemda.go.id',
                    'phone' => '081220100002',
                    'jabatan' => 'Pegawai',
                    'pangkat_gol' => 'Penata (III/c)',
                ],
            ],
        ];

        foreach ($dataset as $opdKode => $pegawais) {
            $opd = $opds->get($opdKode);
            if (!$opd) {
                $opd = Opd::where('kode', $opdKode)->orWhere('nama', 'like', "%{$opdKode}%")->first();
            }

            foreach ($pegawais as $p) {
                $user = User::where('nip', $p['nip'])->orWhere('email', $p['email'])->first();
                if ($user) {
                    $user->update([
                        'name' => $p['name'],
                        'nip' => $p['nip'],
                        'email' => $p['email'],
                        'phone' => $p['phone'],
                        'opd_id' => $opd?->id,
                        'jabatan' => $p['jabatan'],
                        'pangkat_gol' => $p['pangkat_gol'],
                    ]);
                } else {
                    $user = User::create([
                        'name' => $p['name'],
                        'nip' => $p['nip'],
                        'email' => $p['email'],
                        'phone' => $p['phone'],
                        'opd_id' => $opd?->id,
                        'jabatan' => $p['jabatan'],
                        'pangkat_gol' => $p['pangkat_gol'],
                    ]);
                }

                // If this is Kepala OPD, ensure the OPD record knows their name
                if ($p['jabatan'] === 'Kepala OPD' && $opd) {
                    $opd->update(['kepala' => $p['name']]);
                }
            }
        }
    }
}
