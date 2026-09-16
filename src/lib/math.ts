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

export interface IntRange {
    min: number;
    max: number;
}

/**
 * {@link requireInt} over every field `limits` names, keyed by field name. One
 * table drives both the form's `min`/`max` attributes and this check, so the two
 * cannot disagree.
 */
export function requireInts<T extends Record<keyof L, number>, L extends Record<string, IntRange>>(
    params: T,
    limits: L,
): T {
    const checked = { ...params };
    for (const key of Object.keys(limits) as (keyof L & string)[]) {
        (checked as Record<keyof L, number>)[key] = requireInt(key, params[key], limits[key].min, limits[key].max);
    }
    return checked;
}
