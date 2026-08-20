<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceSchedule extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'uuid',
        'vehicle_id',
        'name',
        'interval_km',
        'interval_months',
    ];

    /** @var array<string, string> */
    protected function casts(): array
    {
        return [
            'interval_km' => 'integer',
            'interval_months' => 'integer',
        ];
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
}
