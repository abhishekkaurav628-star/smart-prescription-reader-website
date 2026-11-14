import { clearAuthCookie } from "@/lib/auth";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearAuthCookie();
  return json({ ok: true });
}
