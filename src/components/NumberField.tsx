interface NumberFieldProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step?: number;
    /** Room for five or more digits. */
    wide?: boolean;
    disabled?: boolean;
}

/** Labelled numeric control. Range is enforced when the run starts, not per keystroke. */
export function NumberField({ label, value, onChange, min, max, step, wide, disabled }: NumberFieldProps) {
    return (
        <label className="field">
            <span>{label}</span>
            <input className={wide ? "num num-wide" : "num"} type="number" inputMode="numeric"
                min={min} max={max} step={step} disabled={disabled}
                // A cleared field reads back as NaN; show it empty, and let the
                // run's validation reject it.
                value={Number.isNaN(value) ? "" : value}
                onChange={e => onChange(e.target.valueAsNumber)} />
        </label>
    );
}
