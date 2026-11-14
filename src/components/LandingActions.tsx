"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, LayoutDashboard, Loader2, Sparkles } from "lucide-react";
import { api, getStoredToken, localDate, setStoredSession } from "@/lib/client";
import type { PublicUser } from "@/lib/types";

export function HeaderAuthButtons() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (getStoredToken()) setSignedIn(true);
  }, []);

  if (signedIn) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="btn-primary btn-sm sm:px-4 sm:py-2 sm:text-sm">
          <LayoutDashboard size={15} /> Open Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login" className="btn-ghost btn-sm sm:px-4 sm:py-2 sm:text-sm">
        Sign in
      </Link>
      <Link href="/register" className="btn-primary btn-sm sm:px-4 sm:py-2 sm:text-sm">
        Get started
      </Link>
    </div>
  );
}

export function HeroCtaButtons() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  useEffect(() => {
    if (getStoredToken()) setSignedIn(true);
  }, []);

  async function launchDemo() {
    setDemoBusy(true);
    try {
      const res = await api<{ user: PublicUser; token: string }>("/api/auth/demo", {
        json: { today: localDate() },
      });
      setStoredSession(res.token, res.user);
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      {signedIn ? (
        <Link href="/dashboard" className="btn-primary px-6 py-3 text-base">
          Open my Dashboard <ArrowRight size={18} />
        </Link>
      ) : (
        <Link href="/register" className="btn-primary px-6 py-3 text-base">
          Scan my first prescription <ArrowRight size={18} />
        </Link>
      )}
      <button type="button" onClick={launchDemo} disabled={demoBusy} className="btn-accent px-6 py-3 text-base">
        {demoBusy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
        Instant Demo Dashboard
      </button>
    </div>
  );
}
