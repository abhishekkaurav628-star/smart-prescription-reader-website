import type { MealTimes, ParsedMedicine, Slot } from "./types";

export const DEFAULT_TIMES: MealTimes = {
  morning: "08:00",
  afternoon: "13:30",
  evening: "17:30",
  night: "20:30",
  bedtime: "22:30",
};

export const SLOT_LABELS: Record<Slot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
  bedtime: "Bedtime",
};

export const FREQUENCY_PRESETS: { label: string; slots: Slot[] }[] = [
  { label: "1× a day", slots: ["morning"] },
  { label: "2× a day", slots: ["morning", "night"] },
  { label: "3× a day", slots: ["morning", "afternoon", "night"] },
  { label: "4× a day", slots: ["morning", "afternoon", "evening", "bedtime"] },
  { label: "Bedtime", slots: ["bedtime"] },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTime(t: unknown): t is string {
  return typeof t === "string" && TIME_RE.test(t);
}

export function isValidDate(s: unknown): s is string {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function sortTimes(times: string[]): string[] {
  return Array.from(new Set(times)).sort();
}

export function slotsToTimes(slots: Slot[], meal: MealTimes): string[] {
  return sortTimes(slots.map((s) => meal[s]));
}

export function intervalToTimes(hours: number, startTime: string): string[] {
  const [h, m] = startTime.split(":").map(Number);
  const count = Math.max(1, Math.min(Math.floor(24 / hours), 12));
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const total = (h * 60 + m + i * hours * 60) % 1440;
    out.push(`${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`);
  }
  return sortTimes(out);
}

export function timesForParsed(
  p: Pick<ParsedMedicine, "slots" | "intervalHours" | "asNeeded">,
  meal: MealTimes,
): string[] {
  if (p.asNeeded) return [];
  if (p.intervalHours) return intervalToTimes(p.intervalHours, meal.morning);
  if (p.slots.length) return slotsToTimes(p.slots, meal);
  return [meal.morning];
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function endDateFor(start: string, durationDays: number | null): string | null {
  return durationDays && durationDays > 0 ? addDays(start, durationDays - 1) : null;
}

export function isActiveOn(m: { startDate: string; endDate: string | null }, date: string): boolean {
  return m.startDate <= date && (!m.endDate || m.endDate >= date);
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function formatTime12(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function groupOfTime(t: string): "Morning" | "Afternoon" | "Evening" | "Night" {
  const h = Number(t.split(":")[0]);
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 21) return "Evening";
  return "Night";
}

export function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}
