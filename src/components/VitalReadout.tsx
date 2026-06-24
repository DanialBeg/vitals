import styles from "./VitalReadout.module.css";

/** The big bedside-monitor vital number. Bold, mono, characterful. */
export function VitalReadout({
  value,
  unit = "%",
  label,
  sub,
  color,
}: {
  value: string;
  unit?: string;
  label: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.label} style={{ color }}>
        {label}
      </div>
      <div className={`mono ${styles.value}`} style={{ color }}>
        {value}
        <span className={styles.unit}>{unit}</span>
      </div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  );
}
