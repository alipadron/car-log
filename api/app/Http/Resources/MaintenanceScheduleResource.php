<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaintenanceScheduleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array{id: int, uuid: string, vehicle_id: int, name: string, interval_km: int|null, interval_months: int|null, created_at: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'vehicle_id' => $this->vehicle_id,
            'name' => $this->name,
            'interval_km' => $this->interval_km,
            'interval_months' => $this->interval_months,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
