/**
 * Convert a batted-ball direction and strength to a world-space landing target.
 * Shared between the ball visual and the defensive AI to prevent divergence.
 */
export function calculateLandingPoint(homePlate, power, angleDegrees) {
    if (!Number.isFinite(homePlate?.x) || !Number.isFinite(homePlate?.y)
        || !Number.isFinite(power) || !Number.isFinite(angleDegrees)) {
        throw new TypeError('A landing point needs finite origin, power and angle values');
    }

    const distance = Math.min(800, Math.max(0, power * 12));
    const angle = angleDegrees * Math.PI / 180;
    return {
        x: homePlate.x + Math.cos(angle) * distance,
        y: homePlate.y + Math.sin(angle) * distance,
        distance
    };
}
