"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Clock, Loader2, Pause, Pencil, Pill, Play, Plus, Trash2, X } from "lucide-react";
import { MedicineEditor } from "./MedicineEditor";
import { useUser } from "./UserProvider";
import { api, errorMessage, localDate, notifyDosesChanged } from "@/lib/client";
import { draftFromRecord, draftToPayload, emptyDraft } from "@/lib/drafts";
import { formatDateLabel, formatTime12 } from "@/lib/schedule";
import type { DraftMedicine, MealTimes, MedicineRecord } from "@/lib/types";

interface EditorState {
  id: string | null;
  draft: DraftMedicine;
  startDate: string;
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function MedicinesClient({ mealTimes: propTimes, openAdd }: { mealTimes?: MealTimes; openAdd: boolean }) {
  const { user } = useUser();
  const mealTimes = propTimes ?? user.times;
  const [list, setList] = useState<MedicineRecord[] | null>(null);
  const [today, setToday] = useState("");
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ medicines: MedicineRecord[] }>("/api/medicines");
      setList(res.medicines);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    const t = localDate();
     
    setToday(t);
    load();
    if (openAdd) setEditor({ id: null, draft: emptyDraft(mealTimes), startDate: t });
  }, [load, openAdd, mealTimes]);

  useEffect(() => {
    if (!editor) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEditor(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [editor]);

  async function saveEditor() {
    if (!editor) return;
    const { id, draft, startDate } = editor;
    setError("");
    if (!draft.name.trim()) return setError("Please enter a medicine name.");
    if (!draft.asNeeded && draft.times.length === 0) return setError("Add at least one reminder time.");
    setSaving(true);
    try {
      const body = { ...draftToPayload(draft), startDate };
      if (id) await api(`/api/medicines/${id}`, { method: "PATCH", json: body });
      else await api("/api/medicines", { json: body });
      setEditor(null);
      await load();
      notifyDosesChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(m: MedicineRecord) {
    setBusyId(m.id);
    try {
      await api(`/api/medicines/${m.id}`, { method: "PATCH", json: { active: !m.active } });
      await load();
      notifyDosesChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(m: MedicineRecord) {
    if (!confirm(`Delete ${m.name}? Its reminders and history will be removed.`)) return;
    setBusyId(m.id);
    try {
      await api(`/api/medicines/${m.id}`, { method: "DELETE" });
      await load();
      notifyDosesChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  const completed = (m: MedicineRecord) => Boolean(m.endDate && today && m.endDate < today);
  const activeList = list?.filter((m) => m.active && !completed(m)) ?? [];
  const pausedList = list?.filter((m) => !m.active && !completed(m)) ?? [];
  const doneList = list?.filter(completed) ?? [];

  const renderCard = (m: MedicineRecord) => {
    const left = m.endDate && today ? daysBetween(today, m.endDate) : null;
    const upcoming = today && m.startDate > today;
    return (
      <li key={m.id} className="card p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${m.active ? "bg-navy-900 text-teal-300" : "bg-slate-200 text-slate-500"}`}>
            <Pill size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="text-lg font-extrabold text-navy-900">{m.name}</h3>
              {m.dosage && <span className="badge bg-navy-100 text-navy-800">{m.dosage}</span>}
              {m.form && <span className="badge bg-slate-100 text-slate-700">{m.form}</span>}
              {m.asNeeded && <span className="badge bg-amber-100 text-amber-800">As needed</span>}
              {upcoming && <span className="badge bg-sky-100 text-sky-800">Starts {formatDateLabel(m.startDate)}</span>}
            </div>
            {m.purpose && <p className="mt-0.5 text-sm text-slate-600">{m.purpose}</p>}
            {m.instructions && <p className="text-sm font-medium text-slate-700">{m.instructions}</p>}

            {!m.asNeeded && (
              <p className="mt-3 flex flex-wrap items-center gap-1.5">
                <Clock size={14} className="text-slate-400" />
                {m.times.map((t) => (
                  <span key={t} className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                    {formatTime12(t)}
                  </span>
                ))}
              </p>
            )}
            <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarDays size={14} />
              {formatDateLabel(m.startDate)} → {m.endDate ? formatDateLabel(m.endDate) : "ongoing"}
              {left !== null && left >= 0 && !upcoming && <span className="font-semibold text-navy-700">· {left === 0 ? "last day today" : `${left} day${left === 1 ? "" : "s"} left`}</span>}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-navy-100 pt-3">
          <button className="btn-ghost btn-sm" onClick={() => setEditor({ id: m.id, draft: draftFromRecord(m), startDate: m.startDate })}>
            <Pencil size={13} /> Edit
          </button>
          {!completed(m) && (
            <button className="btn-ghost btn-sm" disabled={busyId === m.id} onClick={() => toggleActive(m)}>
              {m.active ? <Pause size={13} /> : <Play size={13} />} {m.active ? "Pause reminders" : "Resume"}
            </button>
          )}
          <button className="btn-danger btn-sm ml-auto" disabled={busyId === m.id} onClick={() => remove(m)}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </li>
    );
  };

  const section = (title: string, items: MedicineRecord[]) =>
    items.length > 0 && (
      <section>
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-slate-500">
          {title} ({items.length})
        </h2>
        <ul className="grid gap-4 lg:grid-cols-2">{items.map(renderCard)}</ul>
      </section>
    );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">Medicines</h1>
          <p className="mt-1.5 text-slate-600">Everything you&apos;re taking, with reminder times you can adjust any time.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditor({ id: null, draft: emptyDraft(mealTimes), startDate: today || localDate() })}>
          <Plus size={16} /> Add medicine
        </button>
      </header>

      {error && !editor && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      {list === null ? (
        <div className="grid h-40 place-items-center text-slate-500"><Loader2 className="animate-spin" /></div>
      ) : list.length === 0 ? (
        <div className="card p-10 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-navy-900 text-teal-300"><Pill size={28} /></span>
          <h2 className="mt-5 text-xl font-extrabold text-navy-900">No medicines yet</h2>
          <p className="mt-2 text-slate-600">Add one manually, or scan a prescription to add them all at once.</p>
        </div>
      ) : (
        <>
          {section("Active", activeList)}
          {section("Paused", pausedList)}
          {section("Completed", doneList)}
        </>
      )}

      {editor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={editor.id ? "Edit medicine" : "Add medicine"} onClick={() => setEditor(null)}>
          <div className="max-h-[92vh] w-full max-w-2xl animate-slide-up overflow-y-auto rounded-t-3xl bg-navy-50 p-4 shadow-2xl sm:rounded-3xl sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-navy-900">{editor.id ? "Edit medicine" : "Add medicine"}</h2>
              <button onClick={() => setEditor(null)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-white" aria-label="Close"><X size={18} /></button>
            </div>
            <MedicineEditor idPrefix="editor" value={editor.draft} mealTimes={mealTimes} onChange={(draft) => setEditor({ ...editor, draft })} />
            <div className="mt-4">
              <label htmlFor="editor-start" className="label">Start date</label>
              <input id="editor-start" type="date" className="input" value={editor.startDate} onChange={(e) => setEditor({ ...editor, startDate: e.target.value })} />
            </div>
            {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button className="btn-ghost" onClick={() => setEditor(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEditor} disabled={saving}>
                {saving && <Loader2 size={16} className="animate-spin" />} Save medicine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
