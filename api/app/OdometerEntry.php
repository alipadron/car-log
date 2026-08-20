<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OdometerEntry extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'uuid',
        'vehicle_id',
        'value',
        'recorded_at',
    ];

    /** @var array<string, string> */
    protected function casts(): array
    {
        return [
            'value' => 'integer',
            'recorded_at' => 'datetime',
        ];
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
}
