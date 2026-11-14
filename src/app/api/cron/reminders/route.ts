import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { deviceTokens, doseLogs, medicines, users } from "@/db/schema";
import { fcmEnabled, sendPush } from "@/lib/fcm";
import { json } from "@/lib/http";
import { formatTime12, isActiveOn, toMinutes } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const WINDOW_MINUTES = 10;

function localNow(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/**
 * Scheduler endpoint — call every few minutes (Cloud Scheduler, EventBridge, cron, GitHub Actions…).
 * Sends an FCM push for each dose that became due in the last 10 minutes and was not notified yet.
 * Protected by `Authorization: Bearer $CRON_SECRET`.
 */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return json({ error: "CRON_SECRET is not configured." }, 503);
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "Forbidden" }, 403);
  if (!fcmEnabled()) return json({ ok: true, skipped: "FIREBASE_SERVICE_ACCOUNT_JSON is not configured." });

  const tokenRows = await db.select().from(deviceTokens);
  const userIds = Array.from(new Set(tokenRows.map((t) => t.userId)));
  if (userIds.length === 0) return json({ ok: true, notified: 0 });

  const people = await db.select().from(users).where(inArray(users.id, userIds));
  let notified = 0;
  const invalidTokens: string[] = [];

  for (const u of people) {
    const { date, time } = localNow(u.timezone);
    const nowMin = toMinutes(time);
    const meds = await db
      .select()
      .from(medicines)
      .where(and(eq(medicines.userId, u.id), eq(medicines.active, true)));

    for (const m of meds) {
      if (m.asNeeded || !isActiveOn(m, date)) continue;
      for (const t of m.times) {
        const diff = nowMin - toMinutes(t);
        if (diff < 0 || diff > WINDOW_MINUTES) continue;

        // The unique (medicine, date, time) row doubles as an "already notified" marker
        const inserted = await db
          .insert(doseLogs)
          .values({ userId: u.id, medicineId: m.id, doseDate: date, doseTime: t, status: "pending", notifiedAt: new Date() })
          .onConflictDoNothing()
          .returning({ id: doseLogs.id });
        if (inserted.length === 0) continue;

        const tokens = tokenRows.filter((r) => r.userId === u.id).map((r) => r.token);
        const res = await sendPush(tokens, {
          title: `Time for ${m.name}`,
          body: [m.dosage, m.instructions, `scheduled ${formatTime12(t)}`].filter(Boolean).join(" • "),
          url: "/dashboard",
        });
        notified += res.sent;
        invalidTokens.push(...res.invalid);
      }
    }
  }

  if (invalidTokens.length) await db.delete(deviceTokens).where(inArray(deviceTokens.token, invalidTokens));
  return json({ ok: true, notified, removedInvalidTokens: invalidTokens.length });
}

export const GET = run;
export const POST = run;
