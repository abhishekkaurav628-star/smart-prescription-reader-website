import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see today's medicine schedule.">
      <AuthForm mode="login" />
    </AuthShell>
  );
}
