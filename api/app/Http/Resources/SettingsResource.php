<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SettingsResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array{id: int, language: string, distance_unit: string, currency: string, updated_at: string}
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'language' => $this->language,
            'distance_unit' => $this->distance_unit,
            'currency' => $this->currency,
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
