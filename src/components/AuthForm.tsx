"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { api, errorMessage, localDate, setStoredSession } from "@/lib/client";
import type { PublicUser } from "@/lib/types";

interface AuthResponse {
  user: PublicUser;
  token: string;
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const isRegister = mode === "register";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await api<AuthResponse>(isRegister ? "/api/auth/register" : "/api/auth/login", {
        json: {
          name,
          email,
          password,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          today: localDate(),
        },
      });
      setStoredSession(res.token, res.user);
      router.push(isRegister ? "/dashboard/scan?welcome=1" : "/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function loginDemo() {
    setError("");
    setDemoBusy(true);
    try {
      const res = await api<AuthResponse>("/api/auth/demo", {
        json: { today: localDate() },
      });
      setStoredSession(res.token, res.user);
      router.push("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setDemoBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-5">
        {isRegister && (
          <div>
            <label htmlFor="name" className="label">
              Full name
            </label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rahul Verma"
              autoComplete="name"
              required
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={show ? "text" : "password"}
              className="input pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? "Choose a password" : "Your password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-500 hover:text-navy-900"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full py-3" disabled={busy || demoBusy}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          {isRegister ? "Create my account" : "Sign in"}
        </button>
      </form>

      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t border-navy-200" />
        <span className="mx-3 shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">or</span>
        <div className="flex-grow border-t border-navy-200" />
      </div>

      <button
        type="button"
        onClick={loginDemo}
        disabled={busy || demoBusy}
        className="btn-accent w-full py-3"
      >
        {demoBusy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        Instant Demo Sign-In (Pre-loaded Rx)
      </button>

      <p className="text-center text-sm text-slate-600">
        {isRegister ? "Already have an account?" : "New to MediScan?"}{" "}
        <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-navy-700 underline-offset-4 hover:underline">
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
