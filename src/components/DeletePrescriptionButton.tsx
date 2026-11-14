"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { api, errorMessage, notifyDosesChanged } from "@/lib/client";

export function DeletePrescriptionButton({
  id,
  redirectTo,
  onDeleted,
}: {
  id: string;
  redirectTo?: string;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Delete this prescription and all medicines & reminders created from it?")) return;
    setBusy(true);
    try {
      await api(`/api/prescriptions/${id}`, { method: "DELETE" });
      notifyDosesChanged();
      onDeleted?.();
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch (e) {
      alert(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <button onClick={remove} disabled={busy} className="btn-danger btn-sm">
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
    </button>
  );
}
