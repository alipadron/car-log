<?php

use App\DueStatus;
use Carbon\Carbon;

test('never_done when no events exist', function () {
    $schedule = ['interval_km' => 10000, 'interval_months' => 12];
    $now = Carbon::parse('2026-08-20');

    $result = DueStatus::compute($schedule, null, 50000, $now);

    expect($result->status)->toBe('never_done');
    expect($result->kmRemaining)->toBeNull();
    expect($result->monthsRemaining)->toBeNull();
});

test('ok when well within intervals', function () {
    $schedule = ['interval_km' => 10000, 'interval_months' => 12];
    $lastEvent = ['odometer_value' => 40000, 'performed_at' => Carbon::parse('2026-01-01')];
    $now = Carbon::parse('2026-06-01');

    $result = DueStatus::compute($schedule, $lastEvent, 43000, $now);

    expect($result->status)->toBe('ok');
    expect($result->kmRemaining)->toBe(7000);
    expect($result->monthsRemaining)->toBe(7);
});

test('overdue when km interval exceeded', function () {
    $schedule = ['interval_km' => 10000, 'interval_months' => null];
    $lastEvent = ['odometer_value' => 40000, 'performed_at' => Carbon::parse('2026-01-01')];
    $now = Carbon::parse('2026-06-01');

    $result = DueStatus::compute($schedule, $lastEvent, 51000, $now);

    expect($result->status)->toBe('overdue');
    expect($result->kmRemaining)->toBe(-1000);
    expect($result->monthsRemaining)->toBeNull();
});

test('overdue when months interval exceeded', function () {
    $schedule = ['interval_km' => null, 'interval_months' => 6];
    $lastEvent = ['odometer_value' => 40000, 'performed_at' => Carbon::parse('2026-01-01')];
    $now = Carbon::parse('2026-08-01');

    $result = DueStatus::compute($schedule, $lastEvent, 42000, $now);

    expect($result->status)->toBe('overdue');
    expect($result->kmRemaining)->toBeNull();
    expect($result->monthsRemaining)->toBeLessThan(0);
});

test('overdue when both intervals exceeded', function () {
    $schedule = ['interval_km' => 10000, 'interval_months' => 6];
    $lastEvent = ['odometer_value' => 40000, 'performed_at' => Carbon::parse('2026-01-01')];
    $now = Carbon::parse('2026-09-01');

    $result = DueStatus::compute($schedule, $lastEvent, 52000, $now);

    expect($result->status)->toBe('overdue');
    expect($result->kmRemaining)->toBeLessThan(0);
    expect($result->monthsRemaining)->toBeLessThan(0);
});

test('overdue when km exceeded but months ok', function () {
    $schedule = ['interval_km' => 10000, 'interval_months' => 12];
    $lastEvent = ['odometer_value' => 40000, 'performed_at' => Carbon::parse('2026-06-01')];
    $now = Carbon::parse('2026-08-01');

    $result = DueStatus::compute($schedule, $lastEvent, 51000, $now);

    expect($result->status)->toBe('overdue');
    expect($result->kmRemaining)->toBe(-1000);
    expect($result->monthsRemaining)->toBe(10);
});

test('overdue when months exceeded but km ok', function () {
    $schedule = ['interval_km' => 10000, 'interval_months' => 6];
    $lastEvent = ['odometer_value' => 40000, 'performed_at' => Carbon::parse('2026-01-01')];
    $now = Carbon::parse('2026-08-01');

    $result = DueStatus::compute($schedule, $lastEvent, 42000, $now);

    expect($result->status)->toBe('overdue');
    expect($result->kmRemaining)->toBe(8000);
    expect($result->monthsRemaining)->toBeLessThan(0);
});

test('due_soon when within 10% of km interval', function () {
    $schedule = ['interval_km' => 10000, 'interval_months' => 12];
    $lastEvent = ['odometer_value' => 40000, 'performed_at' => Carbon::parse('2026-06-01')];
    $now = Carbon::parse('2026-08-01');

    $result = DueStatus::compute($schedule, $lastEvent, 49200, $now);

    expect($result->status)->toBe('due_soon');
    expect($result->kmRemaining)->toBe(800);
    expect($result->monthsRemaining)->toBe(10);
});

test('due_soon when within 1 month of months interval', function () {
    $schedule = ['interval_km' => 10000, 'interval_months' => 6];
    $lastEvent = ['odometer_value' => 40000, 'performed_at' => Carbon::parse('2026-02-01')];
    $now = Carbon::parse('2026-07-10');

    $result = DueStatus::compute($schedule, $lastEvent, 45000, $now);

    expect($result->status)->toBe('due_soon');
    expect($result->kmRemaining)->toBe(5000);
    expect($result->monthsRemaining)->toBe(0);
});

test('ok with only km interval', function () {
    $schedule = ['interval_km' => 10000, 'interval_months' => null];
    $lastEvent = ['odometer_value' => 40000, 'performed_at' => Carbon::parse('2026-01-01')];
    $now = Carbon::parse('2026-08-20');

    $result = DueStatus::compute($schedule, $lastEvent, 45000, $now);

    expect($result->status)->toBe('ok');
    expect($result->kmRemaining)->toBe(5000);
    expect($result->monthsRemaining)->toBeNull();
});

test('ok with only months interval', function () {
    $schedule = ['interval_km' => null, 'interval_months' => 12];
    $lastEvent = ['odometer_value' => 40000, 'performed_at' => Carbon::parse('2026-01-01')];
    $now = Carbon::parse('2026-06-01');

    $result = DueStatus::compute($schedule, $lastEvent, 45000, $now);

    expect($result->status)->toBe('ok');
    expect($result->kmRemaining)->toBeNull();
    expect($result->monthsRemaining)->toBe(7);
});

test('due_soon at exactly 10% km remaining', function () {
    $schedule = ['interval_km' => 10000, 'interval_months' => null];
    $lastEvent = ['odometer_value' => 40000, 'performed_at' => Carbon::parse('2026-01-01')];
    $now = Carbon::parse('2026-08-20');

    $result = DueStatus::compute($schedule, $lastEvent, 49000, $now);

    expect($result->status)->toBe('due_soon');
    expect($result->kmRemaining)->toBe(1000);
});

test('due_soon when at exactly 0 km remaining', function () {
    $schedule = ['interval_km' => 10000, 'interval_months' => null];
    $lastEvent = ['odometer_value' => 40000, 'performed_at' => Carbon::parse('2026-01-01')];
    $now = Carbon::parse('2026-08-20');

    $result = DueStatus::compute($schedule, $lastEvent, 50000, $now);

    expect($result->status)->toBe('due_soon');
    expect($result->kmRemaining)->toBe(0);
});
