import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { fcmEnabled } from "@/lib/fcm";
import { badRequest, json, readJson, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const rows = await db.select({ id: deviceTokens.id, platform: deviceTokens.platform }).from(deviceTokens).where(eq(deviceTokens.userId, user.id));
  return json({ devices: rows, serverPushEnabled: fcmEnabled() });
}

/** POST { token, platform } — registers an FCM device token for push reminders. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await readJson<{ token?: string; platform?: string }>(req);
  const token = body?.token?.trim();
  if (!token || token.length > 4096) return badRequest("A valid device token is required.");
  const platform = ["web", "android", "ios"].includes(String(body?.platform)) ? String(body?.platform) : "web";

  await db
    .insert(deviceTokens)
    .values({ userId: user.id, token, platform })
    .onConflictDoUpdate({ target: deviceTokens.token, set: { userId: user.id, platform } });
  return json({ ok: true }, 201);
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await readJson<{ token?: string }>(req);
  if (!body?.token) return badRequest("Token required.");
  await db.delete(deviceTokens).where(and(eq(deviceTokens.userId, user.id), eq(deviceTokens.token, body.token)));
  return json({ ok: true });
}
