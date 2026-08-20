<?php

namespace App\Http\Controllers;

use App\Http\Resources\MaintenanceScheduleResource;
use App\MaintenanceSchedule;
use App\Vehicle;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class MaintenanceScheduleController extends Controller
{
    /**
     * Template definitions per vehicle type.
     *
     * @var array<string, list<array{name: string, interval_km: int|null, interval_months: int|null}>>
     */
    private const TEMPLATES = [
        'car' => [
            ['name' => 'Engine oil', 'interval_km' => 10000, 'interval_months' => 12],
            ['name' => 'Oil filter', 'interval_km' => 10000, 'interval_months' => 12],
            ['name' => 'Air filter', 'interval_km' => 20000, 'interval_months' => 24],
            ['name' => 'Tire rotation', 'interval_km' => 10000, 'interval_months' => 12],
            ['name' => 'Brake fluid', 'interval_km' => 40000, 'interval_months' => 24],
            ['name' => 'Coolant', 'interval_km' => 40000, 'interval_months' => 24],
            ['name' => 'Inspection', 'interval_km' => 20000, 'interval_months' => 12],
        ],
        'bike' => [
            ['name' => 'Chain clean/lube', 'interval_km' => 500, 'interval_months' => 1],
            ['name' => 'Chain adjustment', 'interval_km' => 1000, 'interval_months' => 3],
            ['name' => 'Engine oil', 'interval_km' => 5000, 'interval_months' => 6],
            ['name' => 'Brake pads', 'interval_km' => 10000, 'interval_months' => 12],
            ['name' => 'Valve check', 'interval_km' => 10000, 'interval_months' => 12],
            ['name' => 'Tires', 'interval_km' => 20000, 'interval_months' => 24],
        ],
    ];

    /**
     * List maintenance schedules for a vehicle, oldest first.
     */
    public function index(Vehicle $vehicle): AnonymousResourceCollection
    {
        return MaintenanceScheduleResource::collection(
            $vehicle->maintenanceSchedules()->orderBy('created_at')->orderBy('id')->get()
        );
    }

    /**
     * Create a maintenance schedule. Idempotent on client-generated uuid.
     */
    public function store(Request $request, Vehicle $vehicle): JsonResponse
    {
        $validated = $request->validate([
            'uuid' => ['required', 'uuid'],
            'name' => ['required', 'string', 'max:255'],
            'interval_km' => ['nullable', 'integer', 'min:1'],
            'interval_months' => ['nullable', 'integer', 'min:1'],
        ]);

        $this->ensureAtLeastOneInterval($validated);

        $schedule = $vehicle->maintenanceSchedules()
            ->firstOrCreate(['uuid' => $validated['uuid']], $validated);

        return (new MaintenanceScheduleResource($schedule))
            ->response()
            ->setStatusCode($schedule->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Update a maintenance schedule.
     */
    public function update(Request $request, Vehicle $vehicle, MaintenanceSchedule $maintenanceSchedule): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'interval_km' => ['nullable', 'integer', 'min:1'],
            'interval_months' => ['nullable', 'integer', 'min:1'],
        ]);

        $merged = array_merge(
            ['interval_km' => $maintenanceSchedule->interval_km, 'interval_months' => $maintenanceSchedule->interval_months],
            $validated,
        );
        $this->ensureAtLeastOneInterval($merged);

        $maintenanceSchedule->update($validated);

        return (new MaintenanceScheduleResource($maintenanceSchedule))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Delete a maintenance schedule.
     */
    public function destroy(Vehicle $vehicle, MaintenanceSchedule $maintenanceSchedule): Response
    {
        $maintenanceSchedule->delete();

        return response()->noContent();
    }

    /**
     * Seed template schedules for a vehicle type. Idempotent — skips templates
     * that already exist (matched by name for the vehicle).
     */
    public function seed(Vehicle $vehicle): JsonResponse
    {
        $templates = self::TEMPLATES[$vehicle->type] ?? [];

        foreach ($templates as $template) {
            $vehicle->maintenanceSchedules()->firstOrCreate(
                ['name' => $template['name']],
                [
                    'uuid' => fake()->uuid(),
                    ...$template,
                ],
            );
        }

        return MaintenanceScheduleResource::collection(
            $vehicle->maintenanceSchedules()->orderBy('created_at')->orderBy('id')->get()
        )->response()->setStatusCode(200);
    }

    /**
     * Validate that at least one interval is provided.
     *
     * @param array<string, mixed> $data
     */
    private function ensureAtLeastOneInterval(array $data): void
    {
        $hasKm = ! empty($data['interval_km']);
        $hasMonths = ! empty($data['interval_months']);

        if (! $hasKm && ! $hasMonths) {
            throw ValidationException::withMessages([
                'interval_km' => 'At least one interval (km or months) is required.',
                'interval_months' => 'At least one interval (km or months) is required.',
            ]);
        }
    }
}
