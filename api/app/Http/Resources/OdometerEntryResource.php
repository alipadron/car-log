<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OdometerEntryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array{id: int, uuid: string, vehicle_id: int, value: int, recorded_at: string, created_at: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'vehicle_id' => $this->vehicle_id,
            'value' => $this->value,
            'recorded_at' => $this->recorded_at->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
