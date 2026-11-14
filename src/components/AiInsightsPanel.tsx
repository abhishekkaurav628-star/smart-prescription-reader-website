"use client";

import { useState, type FormEvent } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  MessageSquarePlus,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";
import type { AiPrescriptionInsights } from "@/lib/ai-assistant";
import { api, errorMessage } from "@/lib/client";

const AI_KEY_STORAGE = "mediscan:ai-key";
const AI_PROVIDER_STORAGE = "mediscan:ai-provider";

export function getClientAiHeaders(): { apiKey?: string; provider?: string } {
  if (typeof window === "undefined") return {};
  try {
    const apiKey = localStorage.getItem(AI_KEY_STORAGE) ?? undefined;
    const provider = localStorage.getItem(AI_PROVIDER_STORAGE) ?? undefined;
    return { apiKey, provider };
  } catch {
    return {};
  }
}

export function saveClientAiConfig(provider: string, apiKey: string) {
  if (typeof window === "undefined") return;
  try {
    if (apiKey.trim()) {
      localStorage.setItem(AI_KEY_STORAGE, apiKey.trim());
      localStorage.setItem(AI_PROVIDER_STORAGE, provider);
    } else {
      localStorage.removeItem(AI_KEY_STORAGE);
      localStorage.removeItem(AI_PROVIDER_STORAGE);
    }
  } catch {
    /* ignore */
  }
}

export function AiConnectModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (info: { hasExternalKey: boolean; provider: string; maskedKey: string }) => void;
}) {
  const [provider, setProvider] = useState("auto");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      saveClientAiConfig(provider, apiKey);
      const res = await api<{
        ok: boolean;
        hasExternalKey: boolean;
        provider: string;
        maskedKey: string;
      }>("/api/ai/config", {
        json: { provider, apiKey },
      });
      onSaved(res);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Connect AI Provider"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-xl animate-slide-up overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-navy-900 text-teal-300">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-navy-900">Connect AI Vision &amp; Medical Assistant</h2>
              <p className="text-xs text-slate-500">Anthropic Claude · Google Gemini (Free) · OpenAI GPT-4o · Groq</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-navy-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-xs leading-relaxed text-teal-950">
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-amber-950">
            When connected, the original and enhanced prescription images are sent to the selected AI provider for reading. Blur personal details first, and verify every medicine and dose with a clinician.
          </p>
          <p className="font-bold text-teal-900">💡 AI Key kaise lagayein (1 minute):</p>
          <ol className="mt-1.5 list-inside list-decimal space-y-1">
            <li>
              <strong>Anthropic Claude:</strong>{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-teal-800 underline"
              >
                console.anthropic.com/settings/keys <ExternalLink size={11} />
              </a>{" "}
              par <strong>Create Key</strong> par click karein (free credits milte hain). Key <code>sk-ant-...</code> se shuru hoti hai.
            </li>
            <li>
              <strong>Google Gemini (Free option):</strong>{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-teal-800 underline"
              >
                aistudio.google.com/apikey <ExternalLink size={11} />
              </a>{" "}
              par se <strong>Create API Key</strong> (100% Free, key <code>AIza...</code> se shuru hoti hai).
            </li>
            <li>
              Aap <strong>OpenAI</strong> (<code>sk-...</code>) ya <strong>Groq</strong> (<code>gsk_...</code>) ki key bhi daal sakte hain — provider apne aap detect ho jayega!
            </li>
          </ol>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label htmlFor="ai-provider" className="label">
              AI Provider
            </label>
            <select
              id="ai-provider"
              className="input"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              <option value="auto">Auto-detect from API Key (Recommended)</option>
              <option value="anthropic">Anthropic Claude Vision</option>
              <option value="gemini">Google Gemini Vision (gemini-2.5-flash)</option>
              <option value="openai">OpenAI Vision (gpt-4o-mini)</option>
              <option value="groq">Groq Llama Vision (llama-4-scout / llama-3.3-70b)</option>
            </select>
          </div>

          <div>
            <label htmlFor="ai-key" className="label">
              API Key
            </label>
            <input
              id="ai-key"
              type="password"
              className="input font-mono"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste sk-ant-... (Claude), AIza... (Gemini), sk-... (OpenAI), or gsk_... (Groq)"
            />
            <p className="mt-1 text-[11px] text-slate-500">
              External AI reading and answers require a provider key. Without one, the built-in MediScan guide is used.
            </p>
          </div>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="btn-accent">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
              Save &amp; Connect AI
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AiInsightsPanel({
  insights,
  prescriptionContext,
  onOpenConnectModal,
}: {
  insights: AiPrescriptionInsights;
  prescriptionContext: string;
  onOpenConnectModal?: () => void;
}) {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string; engine?: string }[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);

  async function askQuestion(qText: string) {
    const clean = qText.trim();
    if (!clean || asking) return;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: clean }]);
    setAsking(true);
    try {
      const clientAi = getClientAiHeaders();
      const res = await api<{ answer: string; engine: string }>("/api/ai/chat", {
        json: {
          question: clean,
          context: prescriptionContext,
          apiKey: clientAi.apiKey,
          provider: clientAi.provider,
        },
      });
      setMessages((prev) => [...prev, { role: "ai", text: res.answer, engine: res.engine }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: `Error: ${errorMessage(err)}` },
      ]);
    } finally {
      setAsking(false);
    }
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    askQuestion(question);
  }

  return (
    <section className="card overflow-hidden border-teal-200 bg-gradient-to-br from-white via-white to-teal-50/40">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 bg-navy-900 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/20 text-teal-300">
            <Sparkles size={20} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight">AI Prescription Analysis &amp; Doctor Assistant</h2>
              <span className="rounded-full bg-teal-400/20 px-2.5 py-0.5 text-[11px] font-bold text-teal-200">
                {insights.engineUsed}
              </span>
            </div>
            <p className="text-xs text-navy-200">
              Detailed medicine uses, dosage explanation, precautions &amp; interactive Q&amp;A
            </p>
          </div>
        </div>
        {onOpenConnectModal && (
          <button
            type="button"
            onClick={onOpenConnectModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
          >
            <KeyRound size={13} /> Connect Gemini / OpenAI Key
          </button>
        )}
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {/* Executive Summary */}
        <div className="rounded-2xl border border-navy-100 bg-navy-50/70 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-navy-700">
            📋 AI Clinical Summary (सरल भाषा में समझें)
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-800">{insights.summary}</p>
        </div>

        {/* Medicine-by-Medicine Advanced Guide */}
        {insights.medicineGuides.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-navy-900">
              <Stethoscope size={16} className="text-teal-600" /> Medicine-by-Medicine Detailed Guide
            </h3>
            <div className="grid gap-3.5 lg:grid-cols-3">
              {insights.medicineGuides.map((g, idx) => (
                <div
                  key={`${g.name}-${idx}`}
                  className="flex flex-col justify-between rounded-2xl border border-navy-100 bg-white p-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-base font-extrabold text-navy-900">{g.name}</h4>
                      <span className="badge shrink-0 bg-navy-100 text-navy-800">{g.dosage}</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-teal-700">{g.category}</p>

                    <dl className="mt-3 space-y-2 text-xs leading-relaxed text-slate-700">
                      <div>
                        <dt className="font-bold text-navy-900">🎯 Kis kaam aati hai (Use):</dt>
                        <dd>{g.whyPrescribed}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-navy-900">⏰ Kaise aur kab lein:</dt>
                        <dd>{g.howToTake}</dd>
                      </div>
                      <div>
                        <dt className="font-bold text-navy-900">⚠️ Savdhani &amp; Side Effects:</dt>
                        <dd>
                          {g.sideEffects} {g.precautions}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drug Interaction & Doctor's Advice Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <div
            className={`rounded-2xl border p-4 ${
              insights.interactions.status === "safe"
                ? "border-teal-200 bg-teal-50/60"
                : "border-amber-200 bg-amber-50/60"
            }`}
          >
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-navy-900">
              {insights.interactions.status === "safe" ? (
                <ShieldCheck size={16} className="text-teal-600" />
              ) : (
                <ShieldAlert size={16} className="text-amber-600" />
              )}
              Drug Interaction &amp; Safety Check
            </p>
            <p className="mt-1 text-xs font-bold text-slate-800">{insights.interactions.headline}</p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
              {insights.interactions.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-navy-100 bg-white p-4">
            <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-navy-900">
              <CheckCircle2 size={16} className="text-teal-600" /> Doctor&apos;s Advice &amp; Recovery Tips
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
              {insights.doctorAdvice.map((a, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-teal-600">•</span>
                  <span>{a}</span>
                </li>
              ))}
              {insights.lifestyleTips.slice(0, 2).map((t, i) => (
                <li key={`tip-${i}`} className="flex items-start gap-1.5 text-slate-600">
                  <span className="mt-0.5 text-navy-500">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Red Flags */}
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5 text-xs text-rose-900">
          <p className="flex items-center gap-1.5 font-extrabold">
            <AlertCircle size={15} className="text-rose-600" /> Kab Doctor se Turant Milein (Red Flags):
          </p>
          <p className="mt-1 text-rose-800">{insights.redFlags.join(" · ")}</p>
        </div>

        {/* Interactive Ask AI Assistant */}
        <div className="rounded-2xl border border-navy-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-teal-600" />
            <h3 className="text-sm font-extrabold text-navy-900">
              Ask AI Doctor Assistant (Apne Prescription ke baare mein kuch bhi poochein)
            </h3>
          </div>

          {/* Suggested 1-click questions */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {insights.suggestedQuestions.map((sq) => (
              <button
                key={sq}
                type="button"
                onClick={() => askQuestion(sq)}
                disabled={asking}
                className="inline-flex items-center gap-1 rounded-full border border-navy-200 bg-navy-50/70 px-3 py-1 text-xs font-semibold text-navy-800 transition hover:border-teal-400 hover:bg-teal-50"
              >
                <MessageSquarePlus size={12} className="text-teal-600" /> {sq}
              </button>
            ))}
          </div>

          {/* Chat history */}
          {messages.length > 0 && (
            <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-xl bg-navy-50/60 p-3.5">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-navy-900 font-semibold text-white"
                        : "border border-navy-100 bg-white text-slate-800 shadow-sm"
                    }`}
                  >
                    {m.text}
                  </div>
                  {m.engine && (
                    <span className="mt-1 text-[10px] font-medium text-slate-400">{m.engine}</span>
                  )}
                </div>
              ))}
              {asking && (
                <div className="flex items-center gap-2 text-xs font-semibold text-navy-700">
                  <Loader2 size={14} className="animate-spin text-teal-600" /> AI Assistant jawab likh raha hai…
                </div>
              )}
            </div>
          )}

          {/* Question Input */}
          <form onSubmit={handleFormSubmit} className="mt-3 flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Hindi, Hinglish ya English mein poochein (e.g. Kya Levocetirizine se neend aati hai?)"
              className="input flex-1"
            />
            <button type="submit" disabled={asking || !question.trim()} className="btn-accent shrink-0">
              {asking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Ask AI
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
