<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Risiko\TindakPengendalianService;
use PHPUnit\Framework\TestCase;

class TindakPengendalianServiceTest extends TestCase
{
    public function test_kelengkapan_mengharuskan_seluruh_rincian_dan_kedua_skor(): void
    {
        $row = [
            'celah_pengendalian' => 'Prosedur belum dilaksanakan',
            'rencana_tindak' => 'Melaksanakan prosedur',
            'penanggung_jawab' => 'Kepala bidang',
            'target_waktu' => 'Akhir tahun',
            'treated_kemungkinan' => 1,
            'treated_dampak' => 2,
        ];

        $this->assertTrue(TindakPengendalianService::isComplete($row));
        foreach (array_keys($row) as $key) {
            $incomplete = $row;
            $incomplete[$key] = null;
            $this->assertFalse(TindakPengendalianService::isComplete($incomplete), $key);
        }
        $row['rencana_tindak'] = '   ';
        $this->assertFalse(TindakPengendalianService::isComplete($row));
    }
}
