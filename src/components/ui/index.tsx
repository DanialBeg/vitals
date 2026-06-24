import { useEffect, type ReactNode } from "react";
import s from "./ui.module.css";

export function Card({
  title,
  right,
  children,
  className,
  ...rest
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "title">) {
  return (
    <section className={`${s.card} ${className ?? ""}`} {...rest}>
      {title && (
        <div className={s.cardTitle}>
          <span>{title}</span>
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "default" | "danger" | "ghost";
  block?: boolean;
};
export function Button({ variant = "default", block, className, ...rest }: BtnProps) {
  const cls = [
    s.btn,
    variant === "primary" && s.btnPrimary,
    variant === "danger" && s.btnDanger,
    variant === "ghost" && s.btnGhost,
    block && s.btnBlock,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <button className={cls} {...rest} />;
}

export function ProgressBar({
  value,
  color = "var(--retrieval)",
  label,
}: {
  value: number; // 0–1
  color?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className={s.progressTrack}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={s.progressFill} style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Chip({
  active,
  children,
  ...rest
}: { active?: boolean; children: ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`${s.chip} ${active ? s.chipActive : ""}`} aria-pressed={active} {...rest}>
      {children}
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className={s.empty}>{children}</div>;
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={s.scrim} onClick={onClose} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : "Dialog"}>
      <div className={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={s.sheetHandle} />
        <div className={s.sheetTitle}>{title}</div>
        {children}
      </div>
    </div>
  );
}
