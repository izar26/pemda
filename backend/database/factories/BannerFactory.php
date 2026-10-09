<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Banner;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Banner>
 */
class BannerFactory extends Factory
{
    protected $model = Banner::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'description' => fake()->paragraph(),
            'image_path' => 'banners/login/' . fake()->uuid() . '.webp',
            'placement' => 'login',
            'order' => fake()->numberBetween(1, 10),
            'is_active' => true,
            'meta' => [
                'size' => 150000,
                'width' => 1200,
                'height' => 800,
                'mime' => 'image/webp',
            ],
        ];
    }
}
