// Minimal inline stroke icons (no icon library — keeps the bundle lean & offline).
type P = { className?: string };
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export const IconToday = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3 12h4l2 6 4-14 2 8h6" />
  </svg>
);
export const IconPlan = (p: P) => (
  <svg {...base} {...p}>
    <rect x="4" y="5" width="16" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M4 11h16M9 15h2M9 18h6" />
  </svg>
);
export const IconSyllabus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z" />
    <path d="M5 4v16" />
    <path d="M10 9h6M10 13h6" />
  </svg>
);
export const IconActivity = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 19V5M9 19V9M14 19v-7M19 19V7" />
  </svg>
);
export const IconPlus = (p: P) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconCheck = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 12l5 5L20 6" />
  </svg>
);
