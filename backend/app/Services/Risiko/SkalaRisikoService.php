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

    public const ZONA_MERAH = 'merah';

    public const ZONA_ORANYE = 'oranye';

    public const ZONA_KUNING = 'kuning';

    public const ZONA_HIJAU_MUDA = 'hijau_muda';

    public const ZONA_HIJAU_TUA = 'hijau_tua';

    public const ZONA_CONFIG = [
        self::ZONA_MERAH => [
            'id' => self::ZONA_MERAH,
            'label' => 'Zona Merah (Sangat Tinggi)',
            'short_label' => 'Sangat Tinggi',
            'range' => '23 - 25',
            'color' => '#ef4444',
            'bg_class' => 'bg-red-500 text-white',
            'min' => 23,
            'max' => 25,
        ],
        self::ZONA_ORANYE => [
            'id' => self::ZONA_ORANYE,
            'label' => 'Zona Oranye (Tinggi)',
            'short_label' => 'Tinggi',
            'range' => '18 - 22',
            'color' => '#f97316',
            'bg_class' => 'bg-amber-500 text-white',
            'min' => 18,
            'max' => 22,
        ],
        self::ZONA_KUNING => [
            'id' => self::ZONA_KUNING,
            'label' => 'Zona Kuning (Sedang)',
            'short_label' => 'Sedang',
            'range' => '9 - 17',
            'color' => '#eab308',
            'bg_class' => 'bg-yellow-400 text-neutral-900',
            'min' => 9,
            'max' => 17,
        ],
        self::ZONA_HIJAU_MUDA => [
            'id' => self::ZONA_HIJAU_MUDA,
            'label' => 'Zona Hijau Muda (Rendah)',
            'short_label' => 'Rendah',
            'range' => '4 - 8',
            'color' => '#84cc16',
            'bg_class' => 'bg-lime-500 text-neutral-900',
            'min' => 4,
            'max' => 8,
        ],
        self::ZONA_HIJAU_TUA => [
            'id' => self::ZONA_HIJAU_TUA,
            'label' => 'Zona Hijau Tua (Sangat Rendah)',
            'short_label' => 'Sangat Rendah',
            'range' => '1 - 3',
            'color' => '#15803d',
            'bg_class' => 'bg-emerald-600 text-white',
            'min' => 1,
            'max' => 3,
        ],
    ];

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

    public function zona(?int $skala): ?string
    {
        if ($skala === null) {
            return null;
        }
        if ($skala < 1 || $skala > 25) {
            throw new InvalidArgumentException('Skala risiko harus antara 1 dan 25.');
        }

        return match (true) {
            $skala >= 23 => self::ZONA_MERAH,
            $skala >= 18 => self::ZONA_ORANYE,
            $skala >= 9 => self::ZONA_KUNING,
            $skala >= 4 => self::ZONA_HIJAU_MUDA,
            default => self::ZONA_HIJAU_TUA,
        };
    }
}
