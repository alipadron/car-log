<?php

namespace Database\Factories;

use App\Vehicle;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Vehicle>
 */
class VehicleFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'uuid' => fake()->uuid(),
            'name' => fake()->words(2, true),
            'type' => fake()->randomElement(['car', 'bike']),
            'make' => fake()->company(),
            'model' => fake()->word(),
            'year' => fake()->numberBetween(1990, 2026),
        ];
    }
}
