// Single source of truth for blueprint/syllabus content. content.json lives at the
// repo root (kept there deliberately) and is bundled at build time — never fetched,
// so it is offline by construction.
import raw from "../content.json";
import type { Content, Specialty } from "./types";

export const content = raw as unknown as Content;

export const specialties: Specialty[] = content.specialties;
export const phases = content.phases;
export const errorTypes = content.errorTypes;
export const exam = content.exam;

/** Total representative blueprint weight across all specialties. */
export const totalItems = specialties.reduce((s, sp) => s + sp.items, 0);

/** Total number of syllabus conditions (~200). */
export const totalConditions = specialties.reduce(
  (s, sp) => s + sp.conditions.length,
  0,
);

const specialtyById = new Map(specialties.map((s) => [s.id, s]));
export const getSpecialty = (id?: string) =>
  id ? specialtyById.get(id) : undefined;
export const specialtyName = (id?: string) =>
  getSpecialty(id)?.name ?? "General";

export const syllabusKey = (specialtyId: string, conditionIndex: number) =>
  `${specialtyId}:${conditionIndex}`;
