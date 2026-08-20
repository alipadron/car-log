<?php

namespace App;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Repair extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'uuid',
        'vehicle_id',
        'title',
        'notes',
        'cost',
        'performed_at',
        'odometer_value',
    ];

    /** @var array<string, string> */
    protected function casts(): array
    {
        return [
            'cost' => 'decimal:2',
            'performed_at' => 'datetime',
            'odometer_value' => 'integer',
        ];
    }

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
}
