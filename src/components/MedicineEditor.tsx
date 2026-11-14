"use client";

import { Clock, Plus, Trash2, X } from "lucide-react";
import { FREQUENCY_PRESETS, formatTime12, slotsToTimes, sortTimes } from "@/lib/schedule";
import type { DraftMedicine, MealTimes } from "@/lib/types";

const FORMS = ["Tablet", "Capsule", "Syrup", "Injection", "Drops", "Ointment", "Cream", "Gel", "Suspension", "Lotion", "Inhaler", "Sachet"];
const INSTRUCTIONS = ["Before food", "After food", "With food", "On empty stomach", "At bedtime"];

function Confidence({ value }: { value: number }) {
  if (value >= 0.8) return <span className="badge bg-teal-100 text-teal-800">High confidence</span>;
  if (value >= 0.6) return <span className="badge bg-amber-100 text-amber-800">Please double-check</span>;
  return <span className="badge bg-rose-100 text-rose-800">Low confidence — verify</span>;
}

export function MedicineEditor({
  value,
  onChange,
  onRemove,
  mealTimes,
  idPrefix,
}: {
  value: DraftMedicine;
  onChange: (v: DraftMedicine) => void;
  onRemove?: () => void;
  mealTimes: MealTimes;
  idPrefix: string;
}) {
  const set = <K extends keyof DraftMedicine>(k: K, v: DraftMedicine[K]) => onChange({ ...value, [k]: v });
  const id = (s: string) => `${idPrefix}-${s}`;

  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {value.confidence !== undefined && <Confidence value={value.confidence} />}
        {value.matched && value.purpose && <span className="badge bg-navy-100 text-navy-800">{value.purpose}</span>}
        {value.frequencyLabel && <span className="badge bg-slate-100 text-slate-700">Read as “{value.frequencyLabel}”</span>}
        {value.confidence !== undefined && !value.frequencyLabel && <span className="badge bg-amber-100 text-amber-800">Frequency not detected</span>}
        {onRemove && (
          <button type="button" onClick={onRemove} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-700">
            <Trash2 size={14} /> Remove
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={id("name")} className="label">Medicine name</label>
          <input id={id("name")} className="input" value={value.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Paracetamol" required />
        </div>
        <div>
          <label htmlFor={id("dosage")} className="label">Strength / dose</label>
          <input id={id("dosage")} className="input" value={value.dosage} onChange={(e) => set("dosage", e.target.value)} placeholder="500 mg" />
        </div>
        <div>
          <label htmlFor={id("form")} className="label">Form</label>
          <select id={id("form")} className="input" value={value.form} onChange={(e) => set("form", e.target.value)}>
            <option value="">—</option>
            {FORMS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={id("instr")} className="label">Instructions</label>
          <input id={id("instr")} list={id("instr-list")} className="input" value={value.instructions} onChange={(e) => set("instructions", e.target.value)} placeholder="After food" />
          <datalist id={id("instr-list")}>
            {INSTRUCTIONS.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </div>
        <div>
          <label htmlFor={id("days")} className="label">Duration (days)</label>
          <input id={id("days")} type="number" min={1} max={730} className="input" value={value.durationDays} onChange={(e) => set("durationDays", e.target.value)} placeholder="Leave empty if ongoing" />
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-navy-100 bg-navy-50/50 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
            <Clock size={14} /> Reminder times
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={value.asNeeded} onChange={(e) => set("asNeeded", e.target.checked)} className="h-4 w-4 rounded border-navy-300 accent-navy-900" />
            Only as needed (SOS) — no reminders
          </label>
        </div>

        {!value.asNeeded && (
          <>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {FREQUENCY_PRESETS.map((p) => (
                <button key={p.label} type="button" onClick={() => set("times", slotsToTimes(p.slots, mealTimes))} className="rounded-full border border-navy-200 bg-white px-3 py-1 text-xs font-semibold text-navy-800 transition hover:border-navy-400 hover:bg-navy-100">
                  {p.label}
                </button>
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {value.times.map((t, i) => (
                <li key={`${t}-${i}`} className="flex items-center gap-1 rounded-xl border border-navy-200 bg-white py-1 pl-2 pr-1 shadow-sm">
                  <input
                    type="time"
                    value={t}
                    aria-label={`Reminder time ${i + 1} (${formatTime12(t)})`}
                    onChange={(e) => e.target.value && set("times", value.times.map((x, j) => (j === i ? e.target.value : x)))}
                    onBlur={() => set("times", sortTimes(value.times))}
                    className="bg-transparent text-sm font-semibold text-navy-900 outline-none"
                  />
                  <button type="button" onClick={() => set("times", value.times.filter((_, j) => j !== i))} className="grid h-6 w-6 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove time">
                    <X size={14} />
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => set("times", sortTimes([...value.times, "12:00"]))} className="flex h-full items-center gap-1 rounded-xl border border-dashed border-navy-300 px-3 py-2 text-xs font-bold text-navy-700 hover:bg-white">
                  <Plus size={14} /> Add time
                </button>
              </li>
            </ul>
            {value.times.length === 0 && <p className="mt-2 text-xs font-medium text-rose-700">Add at least one reminder time.</p>}
          </>
        )}
      </div>
    </div>
  );
}
