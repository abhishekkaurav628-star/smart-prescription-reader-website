import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" subtitle="Free forever for personal use. Takes less than a minute.">
      <AuthForm mode="register" />
    </AuthShell>
  );
}
