"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BellRing, Bot, CheckCircle2, KeyRound, Loader2, Smartphone, Volume2 } from "lucide-react";
import { AiConnectModal } from "./AiInsightsPanel";
import { useUser } from "./UserProvider";
import { api, errorMessage } from "@/lib/client";
import { firebaseConfigured, registerForPush } from "@/lib/firebase-client";
import { DEFAULT_TIMES, SLOT_LABELS } from "@/lib/schedule";
import { SLOTS, type MealTimes, type PublicUser } from "@/lib/types";

const HINTS: Record<keyof MealTimes, string> = {
  morning: "Breakfast / wake-up",
  afternoon: "Lunch",
  evening: "Evening snack / tea",
  night: "Dinner",
  bedtime: "Before sleep",
};

export function SettingsClient({ user: propUser }: { user?: PublicUser }) {
  const { user: ctxUser, setUser } = useUser();
  const user = propUser ?? ctxUser;
  const [name, setName] = useState(user.name);
  const [times, setTimes] = useState<MealTimes>(user.times);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [sound, setSound] = useState(true);
  const [pushState, setPushState] = useState<{ busy: boolean; message: string; ok: boolean }>({ busy: false, message: "", ok: false });
  const [devices, setDevices] = useState(0);
  const [aiStatus, setAiStatus] = useState<{ hasExternalKey: boolean; provider: string; maskedKey: string }>({
    hasExternalKey: false,
    provider: "builtin",
    maskedKey: "",
  });
  const [connectOpen, setConnectOpen] = useState(false);

  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    try {
      setSound(localStorage.getItem("mediscan:sound") !== "off");
    } catch {
      /* ignore storage errors in restricted iframes */
    }
    api<{ devices: unknown[] }>("/api/devices")
      .then((r) => setDevices(r.devices.length))
      .catch(() => {});
    api<{ hasExternalKey: boolean; provider: string; maskedKey: string }>("/api/ai/config")
      .then((r) => setAiStatus(r))
      .catch(() => {});
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await api<{ user: PublicUser }>("/api/auth/me", {
        method: "PATCH",
        json: { name, times, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      });
      setUser(res.user);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function enableBrowser() {
    const res = await Notification.requestPermission();
    setPerm(res);
  }

  function testNotification() {
    if (Notification.permission === "granted") {
      new Notification("MediScan test", { body: "Reminders are working. You'll be alerted when a dose is due." });
    }
  }

  function toggleSound(on: boolean) {
    setSound(on);
    try {
      localStorage.setItem("mediscan:sound", on ? "on" : "off");
    } catch {
      /* ignore */
    }
  }

  async function enablePush() {
    setPushState({ busy: true, message: "", ok: false });
    try {
      const token = await registerForPush();
      await api("/api/devices", { json: { token, platform: "web" } });
      setDevices((d) => d + 1);
      setPerm(Notification.permission);
      setPushState({ busy: false, message: "This device will now receive push reminders.", ok: true });
    } catch (err) {
      setPushState({ busy: false, message: errorMessage(err), ok: false });
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">Settings</h1>
        <p className="mt-1.5 text-slate-600">Tune reminders, AI provider, and daily routine.</p>
      </header>

      <section className="card space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-teal-300">
            <Bot size={20} />
          </span>
          <div className="flex-1">
            <p className="font-extrabold text-navy-900">AI Vision &amp; Doctor Assistant (Gemini / OpenAI / Groq)</p>
            <p className="text-sm text-slate-600">
              {aiStatus.hasExternalKey
                ? `Connected to ${aiStatus.provider.toUpperCase()} (${aiStatus.maskedKey}) for handwriting OCR and clinical Q&A.`
                : "Currently using Built-in MediScan Clinical AI. Connect an Anthropic Claude API key (best handwriting reading), a free Google Gemini key, or OpenAI / Groq for multimodal handwriting Vision AI."}
            </p>
          </div>
          <button type="button" onClick={() => setConnectOpen(true)} className="btn-accent shrink-0">
            <KeyRound size={15} /> {aiStatus.hasExternalKey ? "Update AI Key" : "Connect AI Key"}
          </button>
        </div>
      </section>

      <form onSubmit={save} className="card space-y-6 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-extrabold text-navy-900">Profile</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="s-name" className="label">Name</label>
              <input id="s-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div>
              <label htmlFor="s-email" className="label">Email</label>
              <input id="s-email" className="input bg-navy-50 text-slate-500" value={user.email} disabled />
            </div>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold text-navy-900">Daily routine</h2>
            <button type="button" className="text-xs font-semibold text-navy-700 hover:underline" onClick={() => setTimes(DEFAULT_TIMES)}>Reset to defaults</button>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            When a prescription says “1-0-1” or “twice a day”, doses are placed at these times. Existing medicines keep their current times — edit them on the Medicines page.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SLOTS.map((slot) => (
              <div key={slot}>
                <label htmlFor={`t-${slot}`} className="label">{SLOT_LABELS[slot]}</label>
                <input id={`t-${slot}`} type="time" className="input" value={times[slot]} onChange={(e) => e.target.value && setTimes({ ...times, [slot]: e.target.value })} required />
                <p className="mt-1 text-xs text-slate-500">{HINTS[slot]}</p>
              </div>
            ))}
          </div>
        </div>

        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}
        <div className="flex items-center gap-4">
          <button className="btn-primary" disabled={saving}>
            {saving && <Loader2 size={16} className="animate-spin" />} Save changes
          </button>
          {saved && <span className="flex items-center gap-1.5 text-sm font-semibold text-teal-700"><CheckCircle2 size={16} /> Saved</span>}
        </div>
      </form>

      <section className="card space-y-6 p-5 sm:p-6">
        <h2 className="text-lg font-extrabold text-navy-900">Notifications</h2>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-teal-300"><BellRing size={20} /></span>
          <div className="flex-1">
            <p className="font-bold text-navy-900">Browser notifications</p>
            <p className="text-sm text-slate-600">
              {perm === "granted" && "Enabled — you'll be alerted while MediScan is open in a tab."}
              {perm === "default" && "Allow notifications to be alerted the moment a dose is due."}
              {perm === "denied" && "Blocked in your browser settings. Allow notifications for this site to enable reminders."}
              {perm === "unsupported" && "This browser does not support notifications."}
            </p>
          </div>
          {perm === "default" && <button type="button" onClick={enableBrowser} className="btn-accent">Enable</button>}
          {perm === "granted" && <button type="button" onClick={testNotification} className="btn-ghost">Send test</button>}
        </div>

        <label className="flex cursor-pointer items-center gap-3 border-t border-navy-100 pt-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-teal-300"><Volume2 size={20} /></span>
          <span className="flex-1">
            <span className="block font-bold text-navy-900">Reminder sound</span>
            <span className="text-sm text-slate-600">Play a short chime when a dose is due.</span>
          </span>
          <input type="checkbox" checked={sound} onChange={(e) => toggleSound(e.target.checked)} className="h-5 w-5 accent-navy-900" />
        </label>

        <div className="flex flex-col gap-3 border-t border-navy-100 pt-5 sm:flex-row sm:items-center">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-teal-300"><Smartphone size={20} /></span>
          <div className="flex-1">
            <p className="font-bold text-navy-900">Push reminders (Firebase Cloud Messaging)</p>
            <p className="text-sm text-slate-600">
              {firebaseConfigured
                ? `Get reminders even when MediScan is closed. ${devices} device${devices === 1 ? "" : "s"} registered.`
                : "Not configured. Add the NEXT_PUBLIC_FIREBASE_* variables to enable background push on this device."}
            </p>
            {pushState.message && (
              <p className={`mt-1 text-sm font-semibold ${pushState.ok ? "text-teal-700" : "text-rose-700"}`} role="status">{pushState.message}</p>
            )}
          </div>
          <button type="button" onClick={enablePush} disabled={!firebaseConfigured || pushState.busy} className="btn-ghost">
            {pushState.busy && <Loader2 size={16} className="animate-spin" />} Enable push
          </button>
        </div>
      </section>

      <AiConnectModal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        onSaved={(info) => setAiStatus(info)}
      />
    </div>
  );
}
