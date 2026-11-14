"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DashboardNav } from "./DashboardNav";
import { ReminderCenter } from "./ReminderCenter";
import { api, getStoredToken, getStoredUser, setStoredUser } from "@/lib/client";
import { DEFAULT_TIMES } from "@/lib/schedule";
import type { PublicUser } from "@/lib/types";

interface UserContextValue {
  user: PublicUser;
  setUser: (u: PublicUser) => void;
}

const FALLBACK_USER: PublicUser = {
  id: "00000000-0000-0000-0000-000000000000",
  name: "Abhishek Kaurav",
  email: "abhishekkaurav628@gmail.com",
  timezone: "Asia/Kolkata",
  times: DEFAULT_TIMES,
};

const UserContext = createContext<UserContextValue | null>(null);

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}

export function UserProvider({ initialUser, children }: { initialUser: PublicUser | null; children: ReactNode }) {
  const [user, setUserState] = useState<PublicUser>(() => initialUser ?? FALLBACK_USER);

  const setUser = (u: PublicUser) => {
    setUserState(u);
    setStoredUser(u);
  };

  useEffect(() => {
    const cached = getStoredUser();
    if (cached) {
      setUserState(cached);
    } else if (initialUser) {
      setStoredUser(initialUser);
      setUserState(initialUser);
    }

    if (getStoredToken() || !initialUser) {
      api<{ user: PublicUser }>("/api/auth/me")
        .then((res) => {
          setUserState(res.user);
          setStoredUser(res.user);
        })
        .catch(() => {
          /* Keep current user session active so the dashboard never closes */
        });
    }
  }, [initialUser]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
        <DashboardNav name={user.name} email={user.email} />
        <div className="min-w-0 pb-24 lg:pb-0">
          <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">{children}</main>
        </div>
        <ReminderCenter />
      </div>
    </UserContext.Provider>
  );
}
