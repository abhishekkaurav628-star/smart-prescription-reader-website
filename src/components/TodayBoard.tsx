"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlarmClock, BellRing, Check, Flame, Loader2, Pill, Plus, ScanLine, Undo2, X } from "lucide-react";
import { DOSES_CHANGED, api, errorMessage, localDate, localTime, notifyDosesChanged } from "@/lib/client";
import { useUser } from "./UserProvider";
import { formatTime12, groupOfTime, toMinutes } from "@/lib/schedule";
import type { DoseItem, DoseStatus, StatsResponse } from "@/lib/types";

const GROUP_ORDER = ["Morning", "Afternoon", "Evening", "Night"] as const;

function greeting(h: number) {
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function Ring({ value, total }: { value: number; total: number }) {
  const pct = total ? value / total : 0;
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e8ecfa" strokeWidth="9" />
        <circle cx="40" cy="40" r={r} fill="none" stroke="#0d9488" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-xl font-extrabold leading-none text-navy-900">{value}/{total}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">taken</p>
        </div>
      </div>
    </div>
  );
}

export function TodayBoard({ name: propName }: { name?: string }) {
  const { user } = useUser();
  const name = propName ?? user.name;
  const [doses, setDoses] = useState<DoseItem[] | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported" | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const d = new Date();
    try {
      const [dRes, sRes] = await Promise.all([
        api<{ doses: DoseItem[] }>(`/api/doses?date=${localDate(d)}`),
        api<StatsResponse>(`/api/doses/stats?today=${localDate(d)}&now=${localTime(d)}&days=7`),
      ]);
      setDoses(dRes.doses);
      setStats(sRes);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
     
    setNow(new Date());
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    load();
    const tick = setInterval(() => setNow(new Date()), 30_000);
    window.addEventListener(DOSES_CHANGED, load);
    return () => {
      clearInterval(tick);
      window.removeEventListener(DOSES_CHANGED, load);
    };
  }, [load]);

  async function mark(d: DoseItem, status: DoseStatus) {
    setPendingKey(d.key);
    setDoses((prev) => prev?.map((x) => (x.key === d.key ? { ...x, status } : x)) ?? prev);
    try {
      await api("/api/doses", { json: { medicineId: d.medicineId, doseDate: d.date, doseTime: d.time, status } });
      notifyDosesChanged();
    } catch (e) {
      setError(errorMessage(e));
      load();
    } finally {
      setPendingKey(null);
    }
  }

  async function enableNotifications() {
    const res = await Notification.requestPermission();
    setPerm(res);
  }

  const nowMin = now ? toMinutes(localTime(now)) : 0;
  const taken = doses?.filter((d) => d.status === "taken").length ?? 0;
  const total = doses?.length ?? 0;

  const next = useMemo(() => {
    if (!doses || !now) return null;
    const pending = doses.filter((d) => d.status === "pending");
    const overdue = pending.filter((d) => toMinutes(d.time) <= nowMin);
    return overdue[0] ?? pending.find((d) => toMinutes(d.time) > nowMin) ?? null;
  }, [doses, now, nowMin]);

  const grouped = useMemo(() => {
    const map = new Map<string, DoseItem[]>();
    for (const d of doses ?? []) {
      const g = groupOfTime(d.time);
      map.set(g, [...(map.get(g) ?? []), d]);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ group: g, items: map.get(g)! }));
  }, [doses]);

  return (
    <div className="space-y-8">
      <header className="animate-slide-up">
        <p className="text-sm font-semibold text-slate-500" suppressHydrationWarning>
          {now ? now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : "\u00a0"}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
          {now ? greeting(now.getHours()) : "Hello"}, {name.split(" ")[0]}
        </h1>
      </header>

      {perm === "default" && (
        <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 sm:flex-row sm:items-center">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-600 text-white">
            <BellRing size={20} />
          </span>
          <div className="flex-1">
            <p className="font-bold text-teal-900">Turn on reminders</p>
            <p className="text-sm text-teal-800">Allow notifications so MediScan can alert you the moment a dose is due.</p>
          </div>
          <button onClick={enableNotifications} className="btn-accent">Enable notifications</button>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {doses === null && !error ? (
        <div className="grid h-48 place-items-center text-slate-500">
          <Loader2 className="animate-spin" />
        </div>
      ) : doses && doses.length === 0 ? (
        <section className="card animate-slide-up p-10 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-navy-900 text-teal-300">
            <Pill size={28} />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-navy-900">No doses scheduled for today</h2>
          <p className="mx-auto mt-2 max-w-md text-slate-600">Scan a prescription and MediScan will build your schedule, or add a medicine manually.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/dashboard/scan" className="btn-primary"><ScanLine size={16} /> Scan prescription</Link>
            <Link href="/dashboard/medicines?add=1" className="btn-ghost"><Plus size={16} /> Add manually</Link>
          </div>
        </section>
      ) : doses ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="card flex items-center gap-5 p-5">
              <Ring value={taken} total={total} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Today&apos;s progress</p>
                <p className="mt-1 text-sm text-slate-600">
                  {taken === total ? "All done — great job!" : `${total - taken} dose${total - taken === 1 ? "" : "s"} to go`}
                </p>
              </div>
            </div>

            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Next up</p>
              {next ? (
                <>
                  <p className="mt-2 truncate text-lg font-extrabold text-navy-900">{next.name}</p>
                  <p className="text-sm text-slate-600">{[next.dosage, next.instructions].filter(Boolean).join(" • ") || "As prescribed"}</p>
                  <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-2.5 py-1 text-xs font-bold text-navy-800">
                    <AlarmClock size={13} /> {formatTime12(next.time)}
                    {toMinutes(next.time) <= nowMin && <span className="text-amber-700">· due now</span>}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-600">Nothing left for today. 🎉</p>
              )}
            </div>

            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Last 7 days</p>
              <div className="mt-2 flex items-end gap-5">
                <div>
                  <p className="text-3xl font-extrabold text-navy-900">{stats?.overall.adherence ?? 0}%</p>
                  <p className="text-xs text-slate-500">adherence</p>
                </div>
                <div className="flex items-center gap-1.5 pb-1 text-amber-600">
                  <Flame size={20} />
                  <span className="text-sm font-bold">{stats?.streak ?? 0} day streak</span>
                </div>
              </div>
              <div className="mt-3 flex h-6 items-end gap-1" aria-hidden>
                {stats?.days.map((d) => {
                  const pct = d.total ? d.taken / d.total : 0;
                  return (
                    <span key={d.date} className="flex-1 rounded-sm bg-navy-100" style={{ height: `${Math.max(12, pct * 100)}%` }}>
                      <span className={`block h-full w-full rounded-sm ${pct >= 0.8 ? "bg-teal-500" : pct > 0 ? "bg-amber-400" : "bg-navy-200"}`} />
                    </span>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            {grouped.map(({ group, items }) => (
              <div key={group}>
                <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-slate-500">{group}</h2>
                <ul className="space-y-3">
                  {items.map((d) => {
                    const diff = nowMin - toMinutes(d.time);
                    const overdue = d.status === "pending" && diff > 60;
                    const dueNow = d.status === "pending" && diff >= 0 && diff <= 60;
                    return (
                      <li
                        key={d.key}
                        className={`card flex flex-col gap-3 p-4 sm:flex-row sm:items-center ${d.status === "taken" ? "border-teal-200 bg-teal-50/50" : d.status === "skipped" ? "opacity-70" : overdue ? "border-amber-200 bg-amber-50/40" : ""}`}
                      >
                        <div className="flex flex-1 items-center gap-4">
                          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${d.status === "taken" ? "bg-teal-600 text-white" : "bg-navy-900 text-teal-300"}`}>
                            {d.status === "taken" ? <Check size={22} /> : <Pill size={22} />}
                          </span>
                          <div className="min-w-0">
                            <p className={`truncate text-base font-extrabold text-navy-900 ${d.status === "skipped" ? "line-through" : ""}`}>{d.name}</p>
                            <p className="text-sm text-slate-600">
                              {formatTime12(d.time)}
                              {d.dosage && ` · ${d.dosage}`}
                              {d.form && ` · ${d.form}`}
                              {d.instructions && ` · ${d.instructions}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:justify-end">
                          {overdue && <span className="badge bg-amber-100 text-amber-800">Overdue</span>}
                          {dueNow && <span className="badge bg-navy-100 text-navy-800">Due now</span>}
                          {d.status === "taken" && <span className="badge bg-teal-100 text-teal-800">Taken</span>}
                          {d.status === "skipped" && <span className="badge bg-slate-200 text-slate-700">Skipped</span>}
                          {d.status === "pending" ? (
                            <>
                              <button onClick={() => mark(d, "taken")} disabled={pendingKey === d.key} className="btn-accent btn-sm ml-auto sm:ml-0">
                                <Check size={14} /> Taken
                              </button>
                              <button onClick={() => mark(d, "skipped")} disabled={pendingKey === d.key} className="btn-ghost btn-sm" aria-label={`Skip ${d.name}`}>
                                <X size={14} /> Skip
                              </button>
                            </>
                          ) : (
                            <button onClick={() => mark(d, "pending")} disabled={pendingKey === d.key} className="btn-ghost btn-sm ml-auto sm:ml-0">
                              <Undo2 size={14} /> Undo
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
