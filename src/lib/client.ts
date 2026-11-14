"use client";

import type { PublicUser } from "./types";

const TOKEN_KEY = "mediscan:token";
const USER_KEY = "mediscan:user";

let memoryToken: string | null = null;
let memoryUser: PublicUser | null = null;

export function getStoredToken(): string | null {
  if (memoryToken) return memoryToken;
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): PublicUser | null {
  if (memoryUser) return memoryUser;
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, user: PublicUser) {
  memoryToken = token;
  memoryUser = user;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore storage quota / iframe security errors */
  }
}

export function setStoredUser(user: PublicUser) {
  memoryUser = user;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* ignore */
  }
}

export function clearStoredSession() {
  memoryToken = null;
  memoryUser = null;
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

/** Fetch wrapper for the REST API. Automatically sends the stored JWT Bearer token and cookies. */
export async function api<T>(url: string, opts: { method?: string; json?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.json !== undefined) headers["Content-Type"] = "application/json";
  const token = getStoredToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method: opts.method ?? (opts.json !== undefined ? "POST" : "GET"),
    headers: Object.keys(headers).length ? headers : undefined,
    body: opts.json !== undefined ? JSON.stringify(opts.json) : undefined,
    credentials: "include",
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function localTime(d = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const DOSES_CHANGED = "mediscan:doses-changed";

export function notifyDosesChanged() {
  window.dispatchEvent(new Event(DOSES_CHANGED));
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong";
}
