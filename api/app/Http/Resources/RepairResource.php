<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RepairResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array{id: int, uuid: string, vehicle_id: int, title: string, notes: string|null, cost: string|null, performed_at: string, odometer_value: int, created_at: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'vehicle_id' => $this->vehicle_id,
            'title' => $this->title,
            'notes' => $this->notes,
            'cost' => $this->cost,
            'performed_at' => $this->performed_at->toIso8601String(),
            'odometer_value' => $this->odometer_value,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
