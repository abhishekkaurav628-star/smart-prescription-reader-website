export type Slot = "morning" | "afternoon" | "evening" | "night" | "bedtime";

export const SLOTS: Slot[] = ["morning", "afternoon", "evening", "night", "bedtime"];

export type MealTimes = Record<Slot, string>;

export interface ParsedMedicine {
  name: string;
  rawLine: string;
  form: string | null;
  dosage: string | null;
  /** Human readable frequency, e.g. "1-0-1" or "Twice a day". Empty when not detected. */
  frequencyLabel: string;
  slots: Slot[];
  intervalHours: number | null;
  asNeeded: boolean;
  durationDays: number | null;
  instructions: string | null;
  purpose: string | null;
  /** 0..1 — how sure the reader is about this line */
  confidence: number;
  /** true when the name was found in the medicine knowledge base */
  matched: boolean;
}

export interface ParsedPrescription {
  doctor: string | null;
  patient: string | null;
  date: string | null;
  diagnosis: string | null;
  medicines: ParsedMedicine[];
}

/** Editable medicine shape used by forms (all strings for input binding) */
export interface DraftMedicine {
  name: string;
  dosage: string;
  form: string;
  instructions: string;
  purpose: string;
  times: string[];
  durationDays: string;
  asNeeded: boolean;
  confidence?: number;
  matched?: boolean;
  frequencyLabel?: string;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  timezone: string;
  times: MealTimes;
}

export interface MedicineRecord {
  id: string;
  prescriptionId: string | null;
  name: string;
  dosage: string | null;
  form: string | null;
  instructions: string | null;
  purpose: string | null;
  times: string[];
  asNeeded: boolean;
  startDate: string;
  endDate: string | null;
  durationDays: number | null;
  active: boolean;
  createdAt: string;
}

export type DoseStatus = "pending" | "taken" | "skipped";

export interface DoseItem {
  key: string;
  medicineId: string;
  name: string;
  dosage: string | null;
  form: string | null;
  instructions: string | null;
  date: string;
  time: string;
  status: DoseStatus;
  actedAt: string | null;
}

export interface DayStat {
  date: string;
  total: number;
  taken: number;
  skipped: number;
  missed: number;
}

export interface RecentLog {
  id: string;
  name: string;
  dosage: string | null;
  doseDate: string;
  doseTime: string;
  status: DoseStatus;
  actedAt: string | null;
}

export interface StatsResponse {
  days: DayStat[];
  overall: { total: number; taken: number; skipped: number; missed: number; adherence: number };
  streak: number;
  recent: RecentLog[];
}
