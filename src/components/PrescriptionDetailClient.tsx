"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Loader2, Pill } from "lucide-react";
import { AiConnectModal, AiInsightsPanel } from "./AiInsightsPanel";
import { DeletePrescriptionButton } from "./DeletePrescriptionButton";
import type { AiPrescriptionInsights } from "@/lib/ai-assistant";
import { api, errorMessage } from "@/lib/client";
import { formatDateLabel, formatTime12 } from "@/lib/schedule";
import type { MedicineRecord, ParsedPrescription } from "@/lib/types";

interface PrescriptionDetailData {
  id: string;
  doctorName: string | null;
  patientName: string | null;
  diagnosis: string | null;
  issuedOn: string | null;
  rawText: string | null;
  source: string;
  createdAt: string;
}

const SOURCES: Record<string, string> = {
  "ocr-tesseract": "Scanned with MediScan Handwriting OCR + AI",
  "ocr-vision": "Scanned with Google Cloud Vision",
  text: "Pasted text",
  manual: "Added manually",
};

export function PrescriptionDetailClient({ id }: { id: string }) {
  const [rx, setRx] = useState<PrescriptionDetailData | null>(null);
  const [meds, setMeds] = useState<MedicineRecord[]>([]);
  const [insights, setInsights] = useState<AiPrescriptionInsights | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ prescription: PrescriptionDetailData; medicines: MedicineRecord[] }>(`/api/prescriptions/${id}`)
      .then(async (res) => {
        setRx(res.prescription);
        setMeds(res.medicines);
        const textToParse =
          res.prescription.rawText ||
          res.medicines.map((m) => `${m.form ?? "Tab."} ${m.name} ${m.dosage ?? ""} ${m.instructions ?? ""}`).join("\n");
        if (textToParse) {
          try {
            const pRes = await api<{ parsed: ParsedPrescription; insights: AiPrescriptionInsights }>("/api/parse", {
              json: { text: textToParse },
            });
            setInsights(pRes.insights);
          } catch {
            /* ignore */
          }
        }
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/prescriptions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-navy-900">
          <ArrowLeft size={16} /> All prescriptions
        </Link>
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      </div>
    );
  }

  if (!rx) {
    return (
      <div className="grid h-40 place-items-center text-slate-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const contextStr = [
    rx.doctorName ? `Doctor: ${rx.doctorName}` : "",
    rx.patientName ? `Patient: ${rx.patientName}` : "",
    rx.diagnosis ? `Diagnosis: ${rx.diagnosis}` : "",
    meds.length
      ? `Medicines:\n${meds.map((m) => `- ${m.name} (${m.dosage ?? ""}, ${m.form ?? "Tablet"}): ${m.asNeeded ? "SOS" : m.times.join(", ")}`).join("\n")}`
      : "",
    rx.rawText ? `Prescription Text:\n${rx.rawText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div className="space-y-8">
      <Link href="/dashboard/prescriptions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-navy-900">
        <ArrowLeft size={16} /> All prescriptions
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">{rx.doctorName ?? "Prescription"}</h1>
          <p className="mt-1.5 text-slate-600">
            {[rx.patientName, rx.issuedOn ? formatDateLabel(rx.issuedOn) : null, SOURCES[rx.source]].filter(Boolean).join(" · ")}
          </p>
          {rx.diagnosis && <p className="mt-2 text-sm font-medium text-slate-700">{rx.diagnosis}</p>}
        </div>
        <DeletePrescriptionButton id={rx.id} redirectTo="/dashboard/prescriptions" />
      </header>

      <section>
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-slate-500">Medicines ({meds.length})</h2>
        <ul className="grid gap-4 lg:grid-cols-2">
          {meds.map((m) => (
            <li key={m.id} className="card p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-teal-300">
                  <Pill size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-extrabold text-navy-900">{m.name}</p>
                  <p className="text-sm text-slate-600">{[m.dosage, m.form, m.instructions].filter(Boolean).join(" · ") || "—"}</p>
                  {m.purpose && <p className="text-xs text-slate-500">{m.purpose}</p>}
                </div>
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                <Clock size={14} className="text-slate-400" />
                {m.asNeeded ? (
                  <span className="badge bg-amber-100 text-amber-800">As needed (SOS)</span>
                ) : (
                  m.times.map((t) => (
                    <span key={t} className="badge bg-teal-50 text-teal-800">
                      {formatTime12(t)}
                    </span>
                  ))
                )}
                <span className="ml-1 text-slate-500">· {m.durationDays ? `${m.durationDays} days` : "ongoing"}</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {insights && (
        <AiInsightsPanel
          insights={insights}
          prescriptionContext={contextStr}
          onOpenConnectModal={() => setConnectOpen(true)}
        />
      )}

      {rx.rawText && (
        <details className="card p-5">
          <summary className="cursor-pointer text-sm font-bold text-navy-900">Original extracted text</summary>
          <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl bg-navy-50 p-4 font-mono text-[13px] leading-relaxed text-slate-700">
            {rx.rawText}
          </pre>
        </details>
      )}

      <AiConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} onSaved={() => {}} />
    </div>
  );
}
