"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import {
  AlertTriangle,
  Bot,
  Camera,
  CheckCircle2,
  FileText,
  ImagePlus,
  KeyRound,
  Loader2,
  Plus,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Type,
  Wand2,
} from "lucide-react";
import { AiConnectModal, AiInsightsPanel, getClientAiHeaders } from "./AiInsightsPanel";
import { MedicineEditor } from "./MedicineEditor";
import { useUser } from "./UserProvider";
import type { AiPrescriptionInsights } from "@/lib/ai-assistant";
import { api, errorMessage, localDate, notifyDosesChanged } from "@/lib/client";
import { draftFromParsed, draftToPayload, emptyDraft } from "@/lib/drafts";
import { SAMPLE_PRESCRIPTION } from "@/lib/parser";
import { prepareImage } from "@/lib/preprocess";
import type { DraftMedicine, MealTimes, ParsedPrescription } from "@/lib/types";

type Stage = "input" | "processing" | "review";
type Engine = "ai-handwriting" | "vision";
type Source = "ocr-tesseract" | "ocr-vision" | "text";

const MIN_TEXT = 5;

/** Generates a realistic handwritten-style prescription image (Narayana Hospital / Dr. R.K. Gupta) for 1-click testing. */
async function createSamplePrescriptionImageFile(): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = 1100;
  canvas.height = 860;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1f2a63";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText("Narayana Hospital", 60, 62);
  ctx.font = "18px sans-serif";
  ctx.fillText("Health for All", 60, 88);
  ctx.fillText("Morena, M.P.  Ph.: 07532-XXXXX", 740, 65);

  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 105);
  ctx.lineTo(1050, 105);
  ctx.stroke();

  ctx.fillStyle = "#1e293b";
  ctx.font = "italic 23px Georgia, serif";
  ctx.fillText("Patient Name :  Abhishek Kaurav", 60, 145);
  ctx.fillText("Date : 08/11/2026", 760, 145);
  ctx.fillText("Age / Sex :  20 Yrs / M", 60, 182);

  ctx.beginPath();
  ctx.moveTo(50, 200);
  ctx.lineTo(1050, 200);
  ctx.stroke();

  ctx.fillStyle = "#1f2a63";
  ctx.font = "italic bold 30px Georgia, serif";
  ctx.fillText("Rx", 60, 245);

  const rxLines = [
    "1) Paracetamol 650 mg          - 10 Tabs",
    "   1 tab SOS (fever/pain)",
    "2) Azithromycin 500 mg         - 3 Tabs",
    "   1 tab OD x 3 days",
    "3) Levocetirizine 5 mg         - 5 Tabs",
    "   1 tab HS x 5 days",
  ];

  ctx.font = "italic 25px Georgia, serif";
  rxLines.forEach((line, idx) => {
    ctx.fillText(line, 80, 295 + idx * 46);
  });

  ctx.font = "italic bold 25px Georgia, serif";
  ctx.fillText("Advice :", 60, 600);
  ctx.font = "italic 23px Georgia, serif";
  ctx.fillText("• Plenty of fluids take karein.", 80, 638);
  ctx.fillText("• Rest karein.", 80, 674);
  ctx.fillText("• Agar bukhar 3 din se jyada rahe to dubara consult karein.", 80, 710);

  ctx.fillStyle = "#1f2a63";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("Dr. R.K. Gupta", 790, 765);
  ctx.font = "17px sans-serif";
  ctx.fillText("MBBS, MD (Medicine)", 780, 792);
  ctx.fillText("Reg. No. MP-72845", 785, 816);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create sample image"))), "image/png");
  });
  return new File([blob], "narayana-hospital-prescription.png", { type: "image/png" });
}

export function ScanClient({ mealTimes: propTimes, welcome }: { mealTimes?: MealTimes; welcome: boolean }) {
  const { user } = useUser();
  const mealTimes = propTimes ?? user.times;
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("input");
  const [tab, setTab] = useState<"image" | "text">("image");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [enhance, setEnhance] = useState(true);
  const [engine, setEngine] = useState<Engine>("ai-handwriting");
  const [visionOk, setVisionOk] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ hasExternalKey: boolean; provider: string; maskedKey: string }>({
    hasExternalKey: false,
    provider: "builtin",
    maskedKey: "",
  });
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [source, setSource] = useState<Source>("text");
  const [meta, setMeta] = useState({ doctor: "", patient: "", issuedOn: "", diagnosis: "" });
  const [meds, setMeds] = useState<DraftMedicine[]>([]);
  const [insights, setInsights] = useState<AiPrescriptionInsights | null>(null);
  const [startDate, setStartDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStartDate(localDate());
    api<{ configured: boolean }>("/api/ocr/vision")
      .then((r) => setVisionOk(r.configured))
      .catch(() => {});
    api<{ hasExternalKey: boolean; provider: string; maskedKey: string }>("/api/ai/config")
      .then((r) => setAiStatus(r))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const pick = useCallback((f: File | null | undefined) => {
    if (!f) return;
    if (f.type && !f.type.startsWith("image/")) {
      setError("Please choose an image file (JPG, PNG, WEBP or HEIC).");
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError("That image is larger than 25 MB. Please use a smaller photo.");
      return;
    }
    setError("");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  async function loadSampleImage() {
    try {
      const sampleFile = await createSamplePrescriptionImageFile();
      pick(sampleFile);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  }

  function applyParsedResult(
    raw: string,
    parsed: ParsedPrescription,
    src: Source,
    aiInsights?: AiPrescriptionInsights | null,
  ) {
    setText(raw);
    setSource(src);
    setMeta({
      doctor: parsed.doctor ?? "",
      patient: parsed.patient ?? "",
      issuedOn: parsed.date ?? "",
      diagnosis: parsed.diagnosis ?? "",
    });
    const drafts = parsed.medicines.map((m) => draftFromParsed(m, mealTimes));
    setMeds(drafts.length > 0 ? drafts : [emptyDraft(mealTimes)]);
    if (aiInsights) setInsights(aiInsights);
    setStage("review");
  }

  async function analyse(raw: string, src: Source) {
    setStatus("Understanding medicines, doses and clinical insights…");
    const res = await api<{
      parsed: ParsedPrescription;
      insights?: AiPrescriptionInsights;
      normalizedText?: string;
    }>("/api/parse", { json: { text: raw } });
    applyParsedResult(res.normalizedText ?? raw, res.parsed, src, res.insights ?? null);
  }

  async function readImage() {
    if (!file) return;
    setError("");
    setStage("processing");
    setProgress(0.15);
    setStatus("Cleaning & preparing prescription image…");
    try {
      const prepared = await prepareImage(file);
      setProgress(0.35);

      if (engine === "vision") {
        setStatus("Sending to Google Cloud Vision…");
        const base64 = prepared.color.toDataURL("image/jpeg", 0.9);
        const res = await api<{ text: string }>("/api/ocr/vision", { json: { image: base64 } });
        setProgress(0.95);
        await analyse(res.text || file.name, "ocr-vision");
        return;
      }

      setStatus(
        aiStatus.hasExternalKey
          ? `Reading doctor's handwriting with ${aiStatus.provider.toUpperCase()} Vision AI…`
          : "Reading doctor's handwriting with MediScan OCR + Clinical AI…",
      );
      setProgress(0.6);

      const colorDataUrl = prepared.color.toDataURL("image/jpeg", 0.92);
      const enhancedDataUrl = enhance ? prepared.enhanced.toDataURL("image/jpeg", 0.92) : undefined;
      const clientAi = getClientAiHeaders();

      const res = await api<{
        text: string;
        parsed: ParsedPrescription;
        insights?: AiPrescriptionInsights;
      }>("/api/ocr", {
        json: {
          image: colorDataUrl,
          enhancedImage: enhancedDataUrl,
          apiKey: clientAi.apiKey,
          provider: clientAi.provider,
        },
      });
      setProgress(0.95);
      const finalText = res.text?.trim() ? res.text : `Scanned image: ${file.name}`;
      applyParsedResult(finalText, res.parsed, "ocr-tesseract", res.insights ?? null);
    } catch (e) {
      setStage("input");
      setError(errorMessage(e));
    }
  }

  async function analyseText(raw: string) {
    setError("");
    if (raw.trim().length < MIN_TEXT) {
      setError("Please paste the prescription text first.");
      return;
    }
    setStage("processing");
    setProgress(0.6);
    try {
      await analyse(raw.trim(), "text");
    } catch (e) {
      setStage("input");
      setError(errorMessage(e));
    }
  }

  async function reanalyse() {
    setError("");
    try {
      const res = await api<{
        parsed: ParsedPrescription;
        insights?: AiPrescriptionInsights;
        normalizedText?: string;
      }>("/api/parse", { json: { text } });
      if (res.parsed.medicines.length > 0) {
        setMeds(res.parsed.medicines.map((m) => draftFromParsed(m, mealTimes)));
      }
      if (res.insights) setInsights(res.insights);
      setMeta((m) => ({
        doctor: res.parsed.doctor ?? m.doctor,
        patient: res.parsed.patient ?? m.patient,
        issuedOn: res.parsed.date ?? m.issuedOn,
        diagnosis: res.parsed.diagnosis ?? m.diagnosis,
      }));
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function save() {
    setError("");
    if (meds.length === 0) return setError("Add at least one medicine to continue.");
    const bad = meds.find((m) => !m.name.trim() || (!m.asNeeded && m.times.length === 0));
    if (bad) return setError(bad.name.trim() ? `Add a reminder time for ${bad.name}.` : "Every medicine needs a name.");

    setSaving(true);
    try {
      await api("/api/prescriptions", {
        json: { ...meta, rawText: text, source, startDate, medicines: meds.map(draftToPayload) },
      });
      notifyDosesChanged();
      router.push("/dashboard");
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  function reset() {
    setStage("input");
    setFile(null);
    setPreview(null);
    setText("");
    setMeds([]);
    setInsights(null);
    setError("");
    setProgress(0);
  }

  const prescriptionContextForChat = [
    meta.doctor ? `Doctor: ${meta.doctor}` : "",
    meta.patient ? `Patient: ${meta.patient}` : "",
    meta.diagnosis ? `Diagnosis: ${meta.diagnosis}` : "",
    meds.length
      ? `Medicines:\n${meds
          .map(
            (m) =>
              `- ${m.name} (${m.dosage || "as prescribed"}, ${m.form || "Tablet"}): ${
                m.asNeeded ? "SOS / As needed" : m.times.join(", ")
              }${m.durationDays ? ` for ${m.durationDays} days` : ""}${m.instructions ? ` (${m.instructions})` : ""}`,
          )
          .join("\n")}`
      : "",
    text ? `Raw Prescription Text:\n${text}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">Scan a prescription</h1>
          <p className="mt-1.5 max-w-2xl text-slate-600">
            Upload a photo of your doctor&apos;s handwritten or printed prescription. MediScan AI reads every medicine, explains how to take it, and sets up your reminders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConnectModalOpen(true)}
          className={`btn-sm inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${
            aiStatus.hasExternalKey
              ? "border-teal-300 bg-teal-50 text-teal-900"
              : "border-navy-200 bg-white text-navy-900 hover:bg-navy-50"
          }`}
        >
          <Bot size={15} className="text-teal-600" />
          {aiStatus.hasExternalKey
            ? `Connected: ${aiStatus.provider.toUpperCase()} AI (${aiStatus.maskedKey})`
            : "Connect AI Key (Claude / Gemini / OpenAI / Groq)"}
        </button>
      </header>

      {welcome && stage === "input" && (
        <p className="flex items-start gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> Welcome to MediScan! Let&apos;s start with your first prescription.
        </p>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}

      {stage === "input" && (
        <section className="card animate-slide-up p-5 sm:p-7">
          <div className="mb-6 inline-flex rounded-xl bg-navy-50 p-1" role="tablist">
            {[
              { id: "image", label: "Photo / image", icon: ImagePlus },
              { id: "text", label: "Paste text", icon: Type },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id as "image" | "text")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${tab === id ? "bg-white text-navy-900 shadow-sm" : "text-slate-600 hover:text-navy-900"}`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          {tab === "image" ? (
            <div className="space-y-5">
              {!file ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${dragging ? "border-teal-500 bg-teal-50" : "border-navy-200 bg-navy-50/50"}`}
                >
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-navy-900 text-teal-300">
                    <ScanLine size={30} />
                  </span>
                  <p className="mt-5 text-lg font-extrabold text-navy-900">Drop your prescription here</p>
                  <p className="mt-1 text-sm text-slate-600">JPG, PNG, WEBP or HEIC · supports handwritten &amp; printed doctor prescriptions</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button type="button" className="btn-primary" onClick={() => fileInput.current?.click()}>
                      <ImagePlus size={16} /> Choose image
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => cameraInput.current?.click()}>
                      <Camera size={16} /> Use camera
                    </button>
                    <button type="button" className="btn-accent" onClick={loadSampleImage}>
                      <Sparkles size={16} /> Try Handwritten Rx Sample
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-[260px_1fr]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview ?? ""} alt="Selected prescription preview" className="max-h-80 w-full rounded-2xl border border-navy-100 bg-navy-50 object-contain" />
                  <div className="space-y-5">
                    <div>
                      <p className="truncate font-bold text-navy-900">{file.name}</p>
                      <button type="button" onClick={() => { setFile(null); setPreview(null); }} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-700">
                        <RotateCcw size={12} /> Choose a different image
                      </button>
                    </div>

                    <fieldset>
                      <div className="mb-1.5 flex items-center justify-between">
                        <legend className="label mb-0">OCR &amp; AI Engine</legend>
                        <button
                          type="button"
                          onClick={() => setConnectModalOpen(true)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline"
                        >
                          <KeyRound size={12} />
                          {aiStatus.hasExternalKey ? "Change AI Key" : "+ Connect Claude / Gemini Key"}
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <label className={`cursor-pointer rounded-xl border p-3 text-sm transition ${engine === "ai-handwriting" ? "border-navy-700 bg-navy-50 ring-2 ring-navy-100" : "border-navy-200 bg-white"}`}>
                          <input type="radio" name="engine" className="sr-only" checked={engine === "ai-handwriting"} onChange={() => setEngine("ai-handwriting")} />
                          <span className="flex items-center gap-1.5 font-bold text-navy-900">
                            <Sparkles size={14} className="text-teal-600" />
                            {aiStatus.hasExternalKey
                              ? aiStatus.provider === "anthropic"
                                ? "Claude Vision + Handwriting AI"
                                : `${aiStatus.provider.toUpperCase()} Vision + Handwriting AI`
                              : "Handwriting OCR + Clinical AI"}
                          </span>
                          <span className="mt-0.5 block text-xs text-slate-600">
                            Reads handwritten Rx (SOS, OD, HS, 1-0-1) &amp; generates full clinical guide + Q&amp;A.
                          </span>
                        </label>
                        <label className={`rounded-xl border p-3 text-sm transition ${visionOk ? "cursor-pointer" : "cursor-not-allowed opacity-60"} ${engine === "vision" ? "border-navy-700 bg-navy-50 ring-2 ring-navy-100" : "border-navy-200 bg-white"}`}>
                          <input type="radio" name="engine" className="sr-only" disabled={!visionOk} checked={engine === "vision"} onChange={() => setEngine("vision")} />
                          <span className="block font-bold text-navy-900">Google Cloud Vision</span>
                          <span className="text-xs text-slate-600">{visionOk ? "Cloud DOCUMENT_TEXT_DETECTION." : "Optional (or click Connect AI Key above for free Gemini Vision)."}</span>
                        </label>
                      </div>
                    </fieldset>

                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                      <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} disabled={engine === "vision"} className="mt-0.5 h-4 w-4 accent-navy-900" />
                      <span>
                        <span className="block font-bold text-navy-900">Enhance image before reading</span>
                        <span className="text-xs text-slate-600">Contrast normalization and shadow removal — helps with uneven lighting.</span>
                      </span>
                    </label>

                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" className="btn-accent py-3" onClick={readImage}>
                        <Wand2 size={16} /> Read prescription &amp; get AI analysis
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
              <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="rx-text" className="label">Prescription text</label>
                <textarea
                  id="rx-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  className="input font-mono text-[13px] leading-relaxed"
                  placeholder={"1) Paracetamol 650 mg - 10 Tabs\n   1 tab SOS (fever/pain)\n2) Azithromycin 500 mg - 3 Tabs\n   1 tab OD x 3 days"}
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn-accent" onClick={() => analyseText(text)}>
                  <Wand2 size={16} /> Analyse text with AI
                </button>
                <button type="button" className="btn-ghost" onClick={() => setText(SAMPLE_PRESCRIPTION)}>
                  <FileText size={16} /> Try sample prescription
                </button>
              </div>
            </div>
          )}

          <p className="mt-6 flex items-start gap-2 border-t border-navy-100 pt-4 text-xs text-slate-500">
            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-teal-600" />
            MediScan does not store prescription images. If you connect external AI, image versions are sent to that provider; only medicines you confirm are saved in your account.
          </p>
        </section>
      )}

      {stage === "processing" && (
        <section className="card animate-fade-in p-10 text-center" aria-live="polite">
          <Loader2 size={36} className="mx-auto animate-spin text-navy-700" />
          <p className="mt-5 text-lg font-extrabold text-navy-900">{status || "Working…"}</p>
          <div className="mx-auto mt-5 h-2.5 max-w-md overflow-hidden rounded-full bg-navy-100" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-teal-500 transition-all duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="mt-3 text-xs text-slate-500">Decoding doctor&apos;s handwriting, dosages, and preparing AI clinical guide…</p>
        </section>
      )}

      {stage === "review" && (
        <div className="animate-slide-up space-y-6">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="flex-1 font-semibold">
              {meds.some((m) => m.name.trim())
                ? `Found ${meds.filter((m) => m.name.trim()).length} medicine${meds.filter((m) => m.name.trim()).length === 1 ? "" : "s"}. Review the AI explanation & schedule below before saving.`
                : "Could not automatically detect medicine names from this image — enter or edit the medicine below, or edit the extracted text and click Re-analyse."}
            </span>
            <button onClick={reset} className="btn-ghost btn-sm"><RotateCcw size={14} /> Scan another</button>
          </div>

          {insights && (
            <AiInsightsPanel
              insights={insights}
              prescriptionContext={prescriptionContextForChat}
              onOpenConnectModal={() => setConnectModalOpen(true)}
            />
          )}

          <section className="card p-5">
            <h2 className="text-lg font-extrabold text-navy-900">Prescription details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["doctor", "Doctor", "Dr. Name"],
                  ["patient", "Patient", "Patient name"],
                  ["diagnosis", "Diagnosis / notes", "Optional"],
                ] as const
              ).map(([k, label, ph]) => (
                <div key={k} className={k === "diagnosis" ? "sm:col-span-2" : ""}>
                  <label htmlFor={`meta-${k}`} className="label">{label}</label>
                  <input id={`meta-${k}`} className="input" value={meta[k]} onChange={(e) => setMeta({ ...meta, [k]: e.target.value })} placeholder={ph} />
                </div>
              ))}
              <div>
                <label htmlFor="meta-date" className="label">Prescription date</label>
                <input id="meta-date" type="date" className="input" value={meta.issuedOn} onChange={(e) => setMeta({ ...meta, issuedOn: e.target.value })} />
              </div>
              <div>
                <label htmlFor="start-date" className="label">Start taking from</label>
                <input id="start-date" type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-extrabold text-navy-900">Detected medicines &amp; reminder schedule</h2>
            {meds.map((m, i) => (
              <MedicineEditor key={i} idPrefix={`med-${i}`} value={m} mealTimes={mealTimes} onChange={(v) => setMeds(meds.map((x, j) => (j === i ? v : x)))} onRemove={() => setMeds(meds.filter((_, j) => j !== i))} />
            ))}
            <button type="button" className="btn-ghost" onClick={() => setMeds([...meds, emptyDraft(mealTimes)])}>
              <Plus size={16} /> Add another medicine
            </button>
          </section>

          <details className="card p-5">
            <summary className="cursor-pointer text-sm font-bold text-navy-900">Extracted prescription text (edit &amp; re-analyse)</summary>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={9} className="input mt-4 font-mono text-[13px]" aria-label="Extracted text" />
            <button type="button" onClick={reanalyse} className="btn-ghost btn-sm mt-3"><Wand2 size={14} /> Re-analyse text</button>
          </details>

          <div className="sticky bottom-20 z-10 flex flex-col gap-3 rounded-2xl border border-navy-100 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
            <p className="text-xs text-slate-600">
              Reminders are set to your daily routine (change it in Settings). MediScan is not a substitute for medical advice.
            </p>
            <button onClick={save} disabled={saving || meds.length === 0} className="btn-primary shrink-0 py-3">
              {saving && <Loader2 size={16} className="animate-spin" />}
              Save &amp; start reminders
            </button>
          </div>
        </div>
      )}

      <AiConnectModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onSaved={(info) => setAiStatus(info)}
      />
    </div>
  );
}
