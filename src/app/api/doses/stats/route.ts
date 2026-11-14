import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/db";
import { doseLogs, medicines } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { badRequest, json, unauthorized } from "@/lib/http";
import { addDays, endDateFor, isActiveOn, isValidDate, isValidTime } from "@/lib/schedule";
import type { DayStat, DoseStatus, StatsResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/doses/stats?today=YYYY-MM-DD&now=HH:MM&days=7
 * Adherence over the last N days. Doses scheduled later today are not counted yet.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const sp = new URL(req.url).searchParams;
  const today = sp.get("today") ?? "";
  const now = sp.get("now") ?? "23:59";
  const days = Math.min(Math.max(Number(sp.get("days") ?? 7) || 7, 1), 90);
  if (!isValidDate(today) || !isValidTime(now)) return badRequest("today must be YYYY-MM-DD and now HH:MM");

  const from = addDays(today, -(days - 1));
  const meds = await db
    .select()
    .from(medicines)
    .where(and(eq(medicines.userId, user.id), eq(medicines.active, true)));

  for (const m of meds) {
    if (m.startDate > today) {
      const newEnd = endDateFor(today, m.durationDays);
      m.startDate = today;
      m.endDate = newEnd;
      await db.update(medicines).set({ startDate: today, endDate: newEnd }).where(eq(medicines.id, m.id));
    }
  }

  const logs = await db
    .select()
    .from(doseLogs)
    .where(and(eq(doseLogs.userId, user.id), gte(doseLogs.doseDate, from)));
  const logMap = new Map(logs.map((l) => [`${l.medicineId}|${l.doseDate}|${l.doseTime}`, l.status]));

  const stats: DayStat[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(from, i);
    const s: DayStat = { date, total: 0, taken: 0, skipped: 0, missed: 0 };
    for (const m of meds) {
      if (m.asNeeded || !isActiveOn(m, date)) continue;
      for (const time of m.times) {
        if (date === today && time > now) continue;
        s.total++;
        const status = logMap.get(`${m.id}|${date}|${time}`);
        if (status === "taken") s.taken++;
        else if (status === "skipped") s.skipped++;
        else s.missed++;
      }
    }
    stats.push(s);
  }

  const overall = stats.reduce(
    (a, d) => ({ total: a.total + d.total, taken: a.taken + d.taken, skipped: a.skipped + d.skipped, missed: a.missed + d.missed }),
    { total: 0, taken: 0, skipped: 0, missed: 0 },
  );

  // Streak: consecutive perfect days ending today/yesterday
  let streak = 0;
  for (let i = stats.length - 1; i >= 0; i--) {
    const d = stats[i];
    if (d.total === 0) {
      if (d.date === today) continue;
      break;
    }
    if (d.taken === d.total) streak++;
    else if (d.date === today) continue;
    else break;
  }

  const medNames = new Map(meds.map((m) => [m.id, m]));
  const recentRows = await db
    .select()
    .from(doseLogs)
    .where(and(eq(doseLogs.userId, user.id), inArray(doseLogs.status, ["taken", "skipped"])))
    .orderBy(desc(doseLogs.actedAt))
    .limit(15);

  const body: StatsResponse = {
    days: stats,
    overall: { ...overall, adherence: overall.total ? Math.round((overall.taken / overall.total) * 100) : 0 },
    streak,
    recent: recentRows
      .filter((r) => medNames.has(r.medicineId))
      .map((r) => ({
        id: r.id,
        name: medNames.get(r.medicineId)!.name,
        dosage: medNames.get(r.medicineId)!.dosage,
        doseDate: r.doseDate,
        doseTime: r.doseTime,
        status: r.status as DoseStatus,
        actedAt: r.actedAt ? r.actedAt.toISOString() : null,
      })),
  };
  return json(body);
}
