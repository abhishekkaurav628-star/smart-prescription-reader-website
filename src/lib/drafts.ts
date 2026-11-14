import { timesForParsed } from "./schedule";
import type { DraftMedicine, MealTimes, MedicineRecord, ParsedMedicine } from "./types";

export function draftFromParsed(p: ParsedMedicine, meal: MealTimes): DraftMedicine {
  return {
    name: p.name,
    dosage: p.dosage ?? "",
    form: p.form ?? "",
    instructions: p.instructions ?? "",
    purpose: p.purpose ?? "",
    times: timesForParsed(p, meal),
    durationDays: p.durationDays ? String(p.durationDays) : "",
    asNeeded: p.asNeeded,
    confidence: p.confidence,
    matched: p.matched,
    frequencyLabel: p.frequencyLabel,
  };
}

export function emptyDraft(meal: MealTimes): DraftMedicine {
  return {
    name: "",
    dosage: "",
    form: "Tablet",
    instructions: "",
    purpose: "",
    times: [meal.morning],
    durationDays: "",
    asNeeded: false,
  };
}

export function draftFromRecord(m: MedicineRecord): DraftMedicine {
  return {
    name: m.name,
    dosage: m.dosage ?? "",
    form: m.form ?? "",
    instructions: m.instructions ?? "",
    purpose: m.purpose ?? "",
    times: m.times,
    durationDays: m.durationDays ? String(m.durationDays) : "",
    asNeeded: m.asNeeded,
  };
}

export function draftToPayload(d: DraftMedicine) {
  return {
    name: d.name,
    dosage: d.dosage,
    form: d.form,
    instructions: d.instructions,
    purpose: d.purpose,
    times: d.times,
    asNeeded: d.asNeeded,
    durationDays: d.durationDays.trim() ? Number(d.durationDays) : null,
  };
}
