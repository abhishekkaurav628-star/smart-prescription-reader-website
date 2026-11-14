import type { ReactNode } from "react";
import { UserProvider } from "@/components/UserProvider";
import { getCurrentUser, toPublicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return <UserProvider initialUser={user ? toPublicUser(user) : null}>{children}</UserProvider>;
}
