<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'language',
        'distance_unit',
        'currency',
    ];

    /**
     * Return the single settings row, creating it with defaults if needed.
     */
    public static function singleton(): static
    {
        return static::firstOrCreate([], [
            'language' => 'en',
            'distance_unit' => 'km',
            'currency' => 'USD',
        ]);
    }
}
