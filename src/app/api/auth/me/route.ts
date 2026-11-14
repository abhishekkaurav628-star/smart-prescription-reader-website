import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, toPublicUser } from "@/lib/auth";
import { badRequest, json, readJson, unauthorized } from "@/lib/http";
import { isValidTime } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return json({ user: toPublicUser(user) });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await readJson<{ name?: string; timezone?: string; times?: Record<string, string> }>(req);
  if (!body) return badRequest("Invalid request body.");

  const patch: Partial<typeof users.$inferInsert> = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (name.length < 2 || name.length > 80) return badRequest("Name must be 2–80 characters.");
    patch.name = name;
  }

  if (body.timezone !== undefined) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: body.timezone });
      patch.timezone = body.timezone;
    } catch {
      return badRequest("Unknown timezone.");
    }
  }

  if (body.times) {
    const map = {
      morning: "morningTime",
      afternoon: "afternoonTime",
      evening: "eveningTime",
      night: "nightTime",
      bedtime: "bedtimeTime",
    } as const;
    for (const [slot, col] of Object.entries(map)) {
      const v = body.times[slot];
      if (v === undefined) continue;
      if (!isValidTime(v)) return badRequest(`Invalid time for ${slot}.`);
      patch[col] = v;
    }
  }

  if (Object.keys(patch).length === 0) return json({ user: toPublicUser(user) });
  const [updated] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
  return json({ user: toPublicUser(updated) });
}
