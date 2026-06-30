export function getAdaptiveTimerDuration(registeredAt) {
    const start = new Date(registeredAt);
    start.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysSinceRegistration =
        Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;

    let durationMinutes;
    if (daysSinceRegistration <= 2) durationMinutes = 10;
    else if (daysSinceRegistration <= 4) durationMinutes = 15;
    else if (daysSinceRegistration <= 6) durationMinutes = 20;
    else if (daysSinceRegistration <= 8) durationMinutes = 22;
    else durationMinutes = 25;

    return { durationMinutes, daysSinceRegistration };
}
