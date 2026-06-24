// ---- Content layer (content.json) ----
export type ExamPaper = {
  name: string;
  questions: number;
  mcq: number;
  emq: number;
  durationMinutes?: number;
};

export type Exam = {
  stream: string;
  name: string;
  date: string; // ISO date
  sittingLabel: string;
  applicationsOpen: string;
  applicationsClose: string;
  reserveDate: string;
  papers: ExamPaper[];
  passMark: { method: string; historicalRange: [number, number]; referenceLine: number };
  context: string;
};

export type Specialty = {
  id: string;
  name: string;
  items: number; // representative blueprint weight
  conditions: string[];
};

export type Phase = {
  id: string;
  name: string;
  fraction: number;
  blurb: string;
  checklist: string[];
};

export type ErrorTypeDef = {
  id: ErrorType;
  label: string;
  hint: string;
};

export type Content = {
  exam: Exam;
  specialties: Specialty[];
  phases: Phase[];
  errorTypes: ErrorTypeDef[];
};

// ---- App state (persisted; one JSON doc per user) ----
export type LogType = "questions" | "lecture" | "cards" | "review";
export type ErrorType = "knowledge" | "misread" | "distractor" | "reasoning" | "careless";
export type Status = "none" | "learning" | "solid";

export type LogEntry = {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  type: LogType;
  specialtyId?: string;
  count: number; // questions done / cards made / reviews done / lectures (1)
  correct?: number; // questions only
  minutes?: number; // for hours tracking
  updatedAt?: string; // per-entity stamp for field-aware merge
};

export type ErrorEntry = {
  id: string;
  date: string;
  specialtyId?: string;
  errorType: ErrorType;
  takeaway: string;
  yourAnswer?: string;
  correctAnswer?: string;
  reattemptDate: string; // date + ~10 days on creation
  resolved: boolean;
  missedAgain: boolean; // true => prompt to make an Anki card
  updatedAt?: string; // per-entity stamp for field-aware merge
};

export type Profile = {
  stream: "adult";
  examDate: string; // ISO; default from content.json, editable
  dailyQuestionTarget: number; // default 20
  studyDaysPerWeek: number; // default 6
};

export type DailyCheck = { ankiCleared?: boolean; updatedAt?: string };

export type AppState = {
  schemaVersion: number;
  profile: Profile;
  log: LogEntry[];
  syllabus: Record<string, Status>; // key: `${specialtyId}:${conditionIndex}`
  errors: ErrorEntry[];
  dailyChecks: Record<string, DailyCheck>; // key: ISO date
  phaseChecks: Record<string, boolean>; // key: `${phaseId}:${checklistIndex}` (additive)
  updatedAt: string; // ISO
};
