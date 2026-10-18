<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Banner;
use App\Models\User;
use Illuminate\Database\Seeder;

class BannerSeeder extends Seeder
{
    /**
     * Run the database seeds for banners.
     */
    public function run(): void
    {
        $admin = User::where('email', 'admin@pemda.go.id')->first();
        $adminId = $admin?->id;

        $banners = [
            [
                'title' => 'Sistem Manajemen Risiko Terpadu PEMDA',
                'description' => 'Mewujudkan tata kelola pemerintahan yang akuntabel, transparan, dan terintegrasi melalui penerapan SPIP Terintegrasi.',
                'image_path' => 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
                'placement' => 'login',
                'order' => 1,
                'is_active' => true,
            ],
            [
                'title' => 'Identifikasi & Mitigasi Risiko Kinerja Strategis',
                'description' => 'Perumusan konteks strategis dan operasional untuk mengamankan pencapaian target Indikator Kinerja Utama (IKU) daerah.',
                'image_path' => 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
                'placement' => 'login',
                'order' => 2,
                'is_active' => true,
            ],
            [
                'title' => 'Kolaborasi Pengawasan Intern APIP & Perangkat Daerah',
                'description' => 'Sinergi berkelanjutan dalam pengawalan akuntabilitas kinerja, penilaian maturitas, dan mitigasi risiko kecurangan.',
                'image_path' => 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80',
                'placement' => 'login',
                'order' => 3,
                'is_active' => true,
            ],
            [
                'title' => 'Sosialisasi Penerapan SPIP Terintegrasi 2028',
                'description' => 'Penyusunan Formulir 2B Konteks Strategis dan Formulir 2C Konteks Operasional di lingkungan Pemerintah Kabupaten Cianjur.',
                'image_path' => 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
                'placement' => 'homepage',
                'order' => 1,
                'is_active' => true,
            ],
            [
                'title' => 'Pemberitahuan Pemeliharaan Server Rutin',
                'description' => 'Jadwal pemeliharaan berkala infrastruktur server dan basis data portal manajemen risiko.',
                'image_path' => 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
                'placement' => 'login',
                'order' => 4,
                'is_active' => false,
            ],
        ];

        foreach ($banners as $b) {
            Banner::updateOrCreate(
                [
                    'title' => $b['title'],
                    'placement' => $b['placement'],
                ],
                [
                    'description' => $b['description'],
                    'image_path' => $b['image_path'],
                    'order' => $b['order'],
                    'is_active' => $b['is_active'],
                    'created_by' => $adminId,
                ]
            );
        }
    }
}
