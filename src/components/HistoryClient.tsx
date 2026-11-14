"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Flame, Loader2, SkipForward, Target } from "lucide-react";
import { DOSES_CHANGED, api, errorMessage, localDate, localTime } from "@/lib/client";
import { formatDateLabel, formatTime12 } from "@/lib/schedule";
import type { StatsResponse } from "@/lib/types";

const RANGES = [7, 14, 30] as const;

export function HistoryClient() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const d = new Date();
    try {
      setData(await api<StatsResponse>(`/api/doses/stats?today=${localDate(d)}&now=${localTime(d)}&days=${range}`));
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    window.addEventListener(DOSES_CHANGED, load);
    return () => window.removeEventListener(DOSES_CHANGED, load);
  }, [load]);

  const maxTotal = Math.max(1, ...(data?.days.map((d) => d.total) ?? [1]));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">History &amp; adherence</h1>
          <p className="mt-1.5 text-slate-600">See how consistently you&apos;ve been taking your medicines.</p>
        </div>
        <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-navy-100" role="group" aria-label="Range">
          {RANGES.map((r) => (
            <button key={r} onClick={() => { setData(null); setRange(r); }} aria-pressed={range === r} className={`rounded-lg px-4 py-1.5 text-sm font-bold transition ${range === r ? "bg-navy-900 text-white" : "text-slate-600 hover:text-navy-900"}`}>
              {r} days
            </button>
          ))}
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      {!data && !error && <div className="grid h-40 place-items-center text-slate-500"><Loader2 className="animate-spin" /></div>}

      {data && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Target, label: "Adherence", value: `${data.overall.adherence}%`, tone: "bg-navy-900 text-teal-300" },
              { icon: Check, label: "Doses taken", value: `${data.overall.taken}/${data.overall.total}`, tone: "bg-teal-600 text-white" },
              { icon: SkipForward, label: "Skipped / missed", value: `${data.overall.skipped} / ${data.overall.missed}`, tone: "bg-amber-500 text-white" },
              { icon: Flame, label: "Perfect-day streak", value: `${data.streak} day${data.streak === 1 ? "" : "s"}`, tone: "bg-rose-500 text-white" },
            ].map(({ icon: Icon, label, value, tone }) => (
              <div key={label} className="card flex items-center gap-4 p-5">
                <span className={`grid h-12 w-12 place-items-center rounded-xl ${tone}`}><Icon size={22} /></span>
                <div>
                  <p className="text-2xl font-extrabold leading-tight text-navy-900">{value}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </section>

          <section className="card p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-navy-900">Daily doses</h2>
              <ul className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
                <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-teal-500" /> Taken</li>
                <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-400" /> Skipped</li>
                <li className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-rose-400" /> Missed</li>
              </ul>
            </div>
            {data.overall.total === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">No scheduled doses in this period yet.</p>
            ) : (
              <div className="flex h-48 items-end gap-1 sm:gap-2" role="img" aria-label="Stacked bar chart of taken, skipped and missed doses per day">
                {data.days.map((d) => {
                  const h = (d.total / maxTotal) * 100;
                  return (
                    <div key={d.date} className="group relative flex h-full flex-1 flex-col justify-end" title={`${formatDateLabel(d.date)} — ${d.taken} taken, ${d.skipped} skipped, ${d.missed} missed`}>
                      <div className="flex flex-col-reverse overflow-hidden rounded-md" style={{ height: `${h}%` }}>
                        <span className="bg-teal-500" style={{ flex: d.taken }} />
                        <span className="bg-amber-400" style={{ flex: d.skipped }} />
                        <span className="bg-rose-400" style={{ flex: d.missed }} />
                      </div>
                      {d.total === 0 && <span className="h-1 rounded bg-navy-100" />}
                      <span className="mt-2 text-center text-[10px] font-semibold text-slate-500">
                        {range <= 14 ? new Date(`${d.date}T00:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" }).slice(0, 3) : d.date.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-slate-500">Recent activity</h2>
            {data.recent.length === 0 ? (
              <p className="card p-6 text-center text-sm text-slate-500">Mark doses as taken on the Today page and they will show up here.</p>
            ) : (
              <ul className="card divide-y divide-navy-100">
                {data.recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${r.status === "taken" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"}`}>
                      {r.status === "taken" ? <Check size={18} /> : <SkipForward size={16} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-navy-900">{r.name}{r.dosage && <span className="font-medium text-slate-500"> · {r.dosage}</span>}</p>
                      <p className="text-xs text-slate-500">{formatDateLabel(r.doseDate)} · scheduled {formatTime12(r.doseTime)}</p>
                    </div>
                    <span className={`badge ${r.status === "taken" ? "bg-teal-100 text-teal-800" : "bg-amber-100 text-amber-800"}`}>{r.status === "taken" ? "Taken" : "Skipped"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
