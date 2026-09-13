/** `value` limited to `[min, max]`; `min` wins if the range is empty. */
export const clamp = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Validates a user-entered integer. Number inputs hand back `0` for an empty
 * field and `NaN` for garbage, and either would otherwise surface much later as
 * a division by zero or an empty run.
 */
export function requireInt(name: string, value: number, min: number, max: number): number {
    if (!Number.isInteger(value) || value < min || value > max) {
        throw new Error(`${name} must be an integer in ${min}..${max}, got ${value}`);
    }
    return value;
}
