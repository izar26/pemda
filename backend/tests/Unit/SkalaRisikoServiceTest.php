<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Risiko\SkalaRisikoService;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class SkalaRisikoServiceTest extends TestCase
{
    public function test_matriks_sesuai_seluruh_kombinasi_excel(): void
    {
        $expected = [[1, 3, 5, 8, 10], [2, 7, 12, 14, 17], [4, 11, 15, 19, 21], [6, 13, 18, 22, 24], [9, 16, 20, 23, 25]];
        $service = new SkalaRisikoService;
        foreach ($expected as $i => $row) {
            foreach ($row as $j => $value) {
                $this->assertSame($value, $service->hitung($i + 1, $j + 1));
            }
        }
    }

    public function test_evaluasi_batas_dan_data_belum_lengkap(): void
    {
        $service = new SkalaRisikoService;
        $this->assertNull($service->hitung(null, 3));
        $this->assertNull($service->evaluasi(null));
        $this->assertSame('Menerima Risiko', $service->evaluasi(9));
        $this->assertSame('Perlu Perlakuan Risiko', $service->evaluasi(10));
    }

    public function test_skor_di_luar_rentang_ditolak(): void
    {
        $this->expectException(InvalidArgumentException::class);
        (new SkalaRisikoService)->hitung(6, 1);
    }
}
