<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VehicleResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array{id: int, uuid: string, name: string, type: string, make: string, model: string, year: int, created_at: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'type' => $this->type,
            'make' => $this->make,
            'model' => $this->model,
            'year' => $this->year,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
