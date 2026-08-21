<?php

namespace App;

use Carbon\Carbon;

/**
 * Pure domain logic for computing whether a maintenance schedule is
 * overdue, due soon, ok, or never-done. Separated from Eloquent so it
 * can be unit-tested without a database.
 */
final class DueStatus
{
    /** @var list<string> */
    public const STATUSES = ['overdue', 'due_soon', 'ok', 'never_done'];

    /** @var array<string, int> Display order: lower = shown first. */
    public const DISPLAY_ORDER = [
        'overdue' => 0,
        'never_done' => 1,
        'due_soon' => 2,
        'ok' => 3,
    ];

    private function __construct(
        public readonly string $status,
        public readonly ?int $kmRemaining,
        public readonly ?int $monthsRemaining,
    ) {}

    /**
     * Compute due status for a schedule given its last event and current
     * odometer/date.
     *
     * @param array{interval_km: int|null, interval_months: int|null} $schedule
     * @param array{odometer_value: int, performed_at: Carbon}|null $lastEvent  null = never serviced
     * @param int   $currentOdometer  Current odometer reading (km)
     * @param Carbon $now             Current date/time
     */
    public static function compute(
        array $schedule,
        ?array $lastEvent,
        int $currentOdometer,
        Carbon $now,
    ): self {
        if ($lastEvent === null) {
            return new self('never_done', null, null);
        }

        $kmRemaining = self::kmRemaining($schedule, $lastEvent, $currentOdometer);
        $monthsRemaining = self::monthsRemaining($schedule, $lastEvent, $now);

        // Overdue: at least one interval strictly past (negative)
        $kmOverdue = $kmRemaining !== null && $kmRemaining < 0;
        $monthsOverdue = $monthsRemaining !== null && $monthsRemaining < 0;

        if ($kmOverdue || $monthsOverdue) {
            return new self('overdue', $kmRemaining, $monthsRemaining);
        }

        // Due soon: within 10% of km interval, or within 1 month, or exactly at 0
        $dueSoonKm = $kmRemaining !== null && $schedule['interval_km'] !== null
            && $kmRemaining <= ($schedule['interval_km'] * 0.1);
        $dueSoonMonths = $monthsRemaining !== null && $monthsRemaining <= 1;

        if ($dueSoonKm || $dueSoonMonths) {
            return new self('due_soon', $kmRemaining, $monthsRemaining);
        }

        return new self('ok', $kmRemaining, $monthsRemaining);
    }

    private static function kmRemaining(array $schedule, array $lastEvent, int $currentOdometer): ?int
    {
        if ($schedule['interval_km'] === null) {
            return null;
        }

        return $schedule['interval_km'] - ($currentOdometer - $lastEvent['odometer_value']);
    }

    private static function monthsRemaining(array $schedule, array $lastEvent, Carbon $now): ?int
    {
        if ($schedule['interval_months'] === null) {
            return null;
        }

        $nextDue = $lastEvent['performed_at']->copy()->addMonths($schedule['interval_months']);

        return (int) $now->diffInMonths($nextDue, false);
    }
}
