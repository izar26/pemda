<?php

declare(strict_types=1);

namespace App\Services\Risiko;

use InvalidArgumentException;

class SkalaRisikoService
{
    private const MATRIKS = [
        [1, 3, 5, 8, 10],
        [2, 7, 12, 14, 17],
        [4, 11, 15, 19, 21],
        [6, 13, 18, 22, 24],
        [9, 16, 20, 23, 25],
    ];

    public function sql(string $kemungkinan, string $dampak): string
    {
        $parts = [];
        foreach (self::MATRIKS as $k => $row) {
            foreach ($row as $d => $value) {
                $parts[] = 'WHEN '.$kemungkinan.' = '.($k + 1).' AND '.$dampak.' = '.($d + 1).' THEN '.$value;
            }
        }

        return 'CASE '.implode(' ', $parts).' ELSE NULL END';
    }

    public function hitung(?int $kemungkinan, ?int $dampak): ?int
    {
        foreach ([$kemungkinan, $dampak] as $skor) {
            if ($skor !== null && ($skor < 1 || $skor > 5)) {
                throw new InvalidArgumentException('Skor kemungkinan dan dampak harus antara 1 dan 5.');
            }
        }

        if ($kemungkinan === null || $dampak === null) {
            return null;
        }

        return self::MATRIKS[$kemungkinan - 1][$dampak - 1];
    }

    public function evaluasi(?int $skala): ?string
    {
        if ($skala === null) {
            return null;
        }
        if ($skala < 1 || $skala > 25) {
            throw new InvalidArgumentException('Skala risiko harus antara 1 dan 25.');
        }

        return $skala <= 9 ? 'Menerima Risiko' : 'Perlu Perlakuan Risiko';
    }
}
