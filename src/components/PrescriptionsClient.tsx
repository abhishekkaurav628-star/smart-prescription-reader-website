"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronRight, FileText, Loader2, ScanLine, Stethoscope } from "lucide-react";
import { DeletePrescriptionButton } from "./DeletePrescriptionButton";
import { api, errorMessage } from "@/lib/client";
import { formatDateLabel } from "@/lib/schedule";

interface PrescriptionRow {
  id: string;
  doctorName: string | null;
  patientName: string | null;
  diagnosis: string | null;
  issuedOn: string | null;
  createdAt: string;
  medicines: { id: string; name: string }[];
}

export function PrescriptionsClient() {
  const [rows, setRows] = useState<PrescriptionRow[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api<{ prescriptions: PrescriptionRow[] }>("/api/prescriptions");
      setRows(res.prescriptions);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy-900">Prescriptions</h1>
          <p className="mt-1.5 text-slate-600">Every prescription you&apos;ve scanned, with the medicines found in it.</p>
        </div>
        <Link href="/dashboard/scan" className="btn-primary">
          <ScanLine size={16} /> Scan new
        </Link>
      </header>

      {error && (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {rows === null && !error ? (
        <div className="grid h-40 place-items-center text-slate-500">
          <Loader2 className="animate-spin" />
        </div>
      ) : rows && rows.length === 0 ? (
        <div className="card p-10 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-navy-900 text-teal-300">
            <FileText size={28} />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-navy-900">No prescriptions yet</h2>
          <p className="mt-2 text-slate-600">Scan your first prescription to see it here.</p>
          <Link href="/dashboard/scan" className="btn-accent mt-6">
            Scan a prescription
          </Link>
        </div>
      ) : rows ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map((rx) => {
            const names = rx.medicines.map((m) => m.name);
            return (
              <li key={rx.id} className="card flex flex-col p-5">
                <Link href={`/dashboard/prescriptions/${rx.id}`} className="group flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-900 text-teal-300">
                    <Stethoscope size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-extrabold text-navy-900">{rx.doctorName ?? "Prescription"}</span>
                    <span className="block text-sm text-slate-600">
                      {rx.patientName ? `${rx.patientName} · ` : ""}
                      {rx.issuedOn
                        ? formatDateLabel(rx.issuedOn)
                        : `Added ${new Date(rx.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                    </span>
                    {rx.diagnosis && <span className="mt-1 block truncate text-sm text-slate-500">{rx.diagnosis}</span>}
                  </span>
                  <ChevronRight className="mt-1 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-navy-700" size={20} />
                </Link>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {names.slice(0, 6).map((n, i) => (
                    <span key={`${n}-${i}`} className="badge bg-teal-50 text-teal-800">
                      {n}
                    </span>
                  ))}
                  {names.length > 6 && <span className="badge bg-slate-100 text-slate-600">+{names.length - 6} more</span>}
                  {names.length === 0 && <span className="text-xs text-slate-500">No medicines</span>}
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-navy-100 pt-3">
                  <span className="text-xs font-semibold text-slate-500">
                    {names.length} medicine{names.length === 1 ? "" : "s"}
                  </span>
                  <DeletePrescriptionButton id={rx.id} onDeleted={load} />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
