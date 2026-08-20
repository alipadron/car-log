<?php

namespace App\Http\Controllers;

use App\DueStatus;
use App\Vehicle;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class HomeController extends Controller
{
    /**
     * Home screen data: per-vehicle odometer, due/overdue schedules, and
     * recent activity (repairs + maintenance events).
     */
    public function __invoke(): JsonResponse
    {
        $vehicles = Vehicle::orderBy('name')->get();

        $home = $vehicles->map(function (Vehicle $vehicle) {
            return [
                'id' => $vehicle->id,
                'name' => $vehicle->name,
                'type' => $vehicle->type,
                'make' => $vehicle->make,
                'model' => $vehicle->model,
                'year' => $vehicle->year,
                'current_odometer' => $this->currentOdometer($vehicle),
                'due_items' => $this->dueItems($vehicle),
                'recent_activity' => $this->recentActivity($vehicle),
            ];
        });

        return response()->json(['data' => $home]);
    }

    /**
     * Current odometer: latest odometer entry, or max value on any event.
     */
    private function currentOdometer(Vehicle $vehicle): ?int
    {
        $latestEntry = $vehicle->odometerEntries()
            ->orderByDesc('recorded_at')
            ->orderByDesc('id')
            ->value('value');

        $latestRepair = $vehicle->repairs()
            ->orderByDesc('performed_at')
            ->orderByDesc('id')
            ->value('odometer_value');

        $latestEvent = $vehicle->maintenanceEvents()
            ->orderByDesc('performed_at')
            ->orderByDesc('id')
            ->value('odometer_value');

        $values = array_filter([$latestEntry, $latestRepair, $latestEvent]);

        return $values ? max($values) : null;
    }

    /**
     * Due/overdue items for all schedules on this vehicle.
     *
     * @return list<array{name: string, status: string, km_remaining: int|null, months_remaining: int|null, schedule_id: int}>
     */
    private function dueItems(Vehicle $vehicle): array
    {
        $schedules = $vehicle->maintenanceSchedules()->get();
        $now = Carbon::now();

        // Get current odometer for this vehicle
        $currentOdometer = $this->currentOdometer($vehicle) ?? 0;

        $items = [];

        foreach ($schedules as $schedule) {
            $lastEvent = $vehicle->maintenanceEvents()
                ->where('schedule_id', $schedule->id)
                ->orderByDesc('performed_at')
                ->orderByDesc('id')
                ->first();

            $lastEventArray = $lastEvent ? [
                'odometer_value' => $lastEvent->odometer_value,
                'performed_at' => $lastEvent->performed_at,
            ] : null;

            $status = DueStatus::compute(
                [
                    'interval_km' => $schedule->interval_km,
                    'interval_months' => $schedule->interval_months,
                ],
                $lastEventArray,
                $currentOdometer,
                $now,
            );

            $items[] = [
                'schedule_id' => $schedule->id,
                'name' => $schedule->name,
                'status' => $status->status,
                'km_remaining' => $status->kmRemaining,
                'months_remaining' => $status->monthsRemaining,
            ];
        }

        // Sort: overdue first, then due_soon, then never_done, then ok
        $order = ['overdue' => 0, 'never_done' => 1, 'due_soon' => 2, 'ok' => 3];
        usort($items, fn (array $a, array $b) => ($order[$a['status']] ?? 9) <=> ($order[$b['status']] ?? 9));

        return $items;
    }

    /**
     * Recent activity: last 5 items (repairs + maintenance events), newest first.
     *
     * @return list<array{type: string, title: string, performed_at: string, odometer_value: int, cost: string|null, id: int}>
     */
    private function recentActivity(Vehicle $vehicle): array
    {
        $repairs = $vehicle->repairs()
            ->select('id', 'title', 'performed_at', 'odometer_value', 'cost')
            ->orderByDesc('performed_at')
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'type' => 'repair',
                'id' => $r->id,
                'title' => $r->title,
                'performed_at' => $r->performed_at->toIso8601String(),
                'odometer_value' => $r->odometer_value,
                'cost' => $r->cost,
            ]);

        $events = $vehicle->maintenanceEvents()
            ->select('id', 'notes', 'performed_at', 'odometer_value', 'cost')
            ->orderByDesc('performed_at')
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(fn ($e) => [
                'type' => 'maintenance',
                'id' => $e->id,
                'title' => $e->notes ?? 'Maintenance',
                'performed_at' => $e->performed_at->toIso8601String(),
                'odometer_value' => $e->odometer_value,
                'cost' => $e->cost,
            ]);

        return $repairs->concat($events)
            ->sortByDesc('performed_at')
            ->take(5)
            ->values()
            ->all();
    }
}
