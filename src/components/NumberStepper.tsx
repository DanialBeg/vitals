import s from "./NumberStepper.module.css";

type Val = number | "";

/**
 * A clean −/＋ stepper replacing the native number spinner. Supports an empty
 * state (for optional fields) and clamps to [min, max].
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  allowEmpty = false,
  placeholder = "—",
  ariaLabel,
}: {
  value: Val;
  onChange: (v: Val) => void;
  min?: number;
  max?: number;
  step?: number;
  allowEmpty?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const num = value === "" ? null : value;
  const clamp = (n: number) => {
    let r = Math.max(min, n);
    if (max != null) r = Math.min(max, r);
    return r;
  };

  const dec = () => {
    if (num == null) onChange(allowEmpty ? "" : min);
    else onChange(clamp(num - step));
  };
  const inc = () => {
    if (num == null) onChange(clamp(step));
    else onChange(clamp(num + step));
  };
  const onInput = (raw: string) => {
    if (raw === "") return onChange(allowEmpty ? "" : 0);
    const n = parseInt(raw.replace(/[^\d-]/g, ""), 10);
    if (Number.isNaN(n)) return;
    onChange(clamp(n));
  };

  const decDisabled = num != null && num <= min;
  const incDisabled = num != null && max != null && num >= max;

  return (
    <div className={s.stepper}>
      <button type="button" className={s.btn} onClick={dec} disabled={decDisabled} aria-label="Decrease" tabIndex={-1}>
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
      </button>
      <input
        className={`mono ${s.input}`}
        type="text"
        inputMode="numeric"
        value={value === "" ? "" : String(value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => onInput(e.target.value)}
      />
      <button type="button" className={s.btn} onClick={inc} disabled={incDisabled} aria-label="Increase" tabIndex={-1}>
        <svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
      </button>
    </div>
  );
}
