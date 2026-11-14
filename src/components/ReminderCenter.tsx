"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlarmClock, Check, Pill, X } from "lucide-react";
import { DOSES_CHANGED, api, localDate, localTime, notifyDosesChanged } from "@/lib/client";
import { formatTime12, toMinutes } from "@/lib/schedule";
import type { DoseItem } from "@/lib/types";

const SOUND_KEY = "mediscan:sound";
const NOTIFIED_KEY = "mediscan:notified";
const SNOOZE_MS = 10 * 60 * 1000;
const LOOKBACK_MIN = 180;

function beep() {
  try {
    if (localStorage.getItem(SOUND_KEY) === "off") return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.2);
    });
    setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    /* autoplay may be blocked until the user interacts — ignore */
  }
}

function loadNotified(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(NOTIFIED_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

/**
 * Runs inside the dashboard: polls today's schedule, shows in-app reminder cards, plays a chime
 * and (if permitted) raises a native browser notification when a dose becomes due.
 */
export function ReminderCenter() {
  const [due, setDue] = useState<DoseItem[]>([]);
  const doses = useRef<DoseItem[]>([]);
  const snoozed = useRef(new Map<string, number>());
  const notified = useRef<Set<string> | null>(null);

  const evaluate = useCallback(() => {
    if (!notified.current) notified.current = loadNotified();
    const now = new Date();
    const nowMin = toMinutes(localTime(now));
    const today = localDate(now);

    const list = doses.current.filter((d) => {
      if (d.status !== "pending" || d.date !== today) return false;
      const diff = nowMin - toMinutes(d.time);
      if (diff < 0 || diff > LOOKBACK_MIN) return false;
      return (snoozed.current.get(d.key) ?? 0) <= now.getTime();
    });
    setDue(list);

    for (const d of list) {
      if (notified.current.has(d.key)) continue;
      notified.current.add(d.key);
      try {
        sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notified.current]));
      } catch {
        /* ignore sessionStorage errors in restricted iframes */
      }
      beep();
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification(`Time for ${d.name}`, {
            body: [d.dosage, d.instructions, `Scheduled ${formatTime12(d.time)}`].filter(Boolean).join(" • "),
            tag: d.key,
          });
        } catch {
          /* some mobile browsers only allow notifications via service worker */
        }
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ doses: DoseItem[] }>(`/api/doses?date=${localDate()}`);
      doses.current = res.doses;
      evaluate();
    } catch {
      /* offline or signed out — try again on the next tick */
    }
  }, [evaluate]);

  useEffect(() => {
    refresh();
    const fetchTimer = setInterval(refresh, 60_000);
    const evalTimer = setInterval(evaluate, 15_000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    window.addEventListener(DOSES_CHANGED, refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(fetchTimer);
      clearInterval(evalTimer);
      window.removeEventListener(DOSES_CHANGED, refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, evaluate]);

  async function act(d: DoseItem, status: "taken" | "skipped") {
    setDue((prev) => prev.filter((x) => x.key !== d.key));
    try {
      await api("/api/doses", { json: { medicineId: d.medicineId, doseDate: d.date, doseTime: d.time, status } });
    } finally {
      notifyDosesChanged();
    }
  }

  function snooze(d: DoseItem) {
    snoozed.current.set(d.key, Date.now() + SNOOZE_MS);
    notified.current?.delete(d.key);
    setDue((prev) => prev.filter((x) => x.key !== d.key));
  }

  if (due.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-20 z-50 flex flex-col items-end gap-3 lg:inset-x-auto lg:bottom-6 lg:right-6" aria-live="assertive">
      {due.slice(0, 3).map((d) => (
        <div key={d.key} role="alert" className="pointer-events-auto w-full max-w-sm animate-slide-up overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-2xl shadow-navy-900/20">
          <div className="flex items-start gap-3 p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-teal-300">
              <Pill size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Time for your medicine</p>
              <p className="truncate text-base font-extrabold text-navy-900">{d.name}</p>
              <p className="text-sm text-slate-600">
                {[d.dosage, d.instructions].filter(Boolean).join(" • ") || "Take as prescribed"} · {formatTime12(d.time)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-navy-100 bg-navy-50/60 p-2.5">
            <button onClick={() => act(d, "taken")} className="btn-accent btn-sm">
              <Check size={14} /> Taken
            </button>
            <button onClick={() => snooze(d)} className="btn-ghost btn-sm">
              <AlarmClock size={14} /> 10 min
            </button>
            <button onClick={() => act(d, "skipped")} className="btn-ghost btn-sm">
              <X size={14} /> Skip
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
