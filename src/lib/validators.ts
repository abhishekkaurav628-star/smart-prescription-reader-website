import { isValidDate, isValidTime, sortTimes } from "./schedule";

export interface MedicineInput {
  name: string;
  dosage: string | null;
  form: string | null;
  instructions: string | null;
  purpose: string | null;
  times: string[];
  asNeeded: boolean;
  startDate: string;
  durationDays: number | null;
}

const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t.length ? t : null;
};

/** Validates untrusted medicine JSON. Returns the cleaned input or an error message. */
export function parseMedicineInput(raw: unknown, fallbackStart: string): MedicineInput | string {
  if (!raw || typeof raw !== "object") return "Invalid medicine data.";
  const r = raw as Record<string, unknown>;

  const name = clean(r.name, 120);
  if (!name) return "Medicine name is required.";

  const asNeeded = r.asNeeded === true;
  const times = Array.isArray(r.times) ? r.times.filter(isValidTime) : [];
  if (!asNeeded && times.length === 0) return `Add at least one reminder time for ${name}.`;
  if (times.length > 12) return `Too many reminder times for ${name}.`;

  let durationDays: number | null = null;
  if (r.durationDays !== null && r.durationDays !== undefined && r.durationDays !== "") {
    const n = Number(r.durationDays);
    if (!Number.isInteger(n) || n < 1 || n > 730) return `Duration for ${name} must be between 1 and 730 days.`;
    durationDays = n;
  }

  const startDate = isValidDate(r.startDate) ? r.startDate : fallbackStart;

  return {
    name,
    dosage: clean(r.dosage, 60),
    form: clean(r.form, 40),
    instructions: clean(r.instructions, 120),
    purpose: clean(r.purpose, 160),
    times: asNeeded ? [] : sortTimes(times),
    asNeeded,
    startDate,
    durationDays,
  };
}
