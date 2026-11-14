import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { doseLogs, medicines } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { badRequest, isUuid, json, notFound, readJson, unauthorized } from "@/lib/http";
import { endDateFor, isActiveOn, isValidDate, isValidTime } from "@/lib/schedule";
import type { DoseItem, DoseStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

/** GET /api/doses?date=YYYY-MM-DD — the schedule for one day merged with taken/skipped logs. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const date = new URL(req.url).searchParams.get("date") ?? "";
  if (!isValidDate(date)) return badRequest("date must be YYYY-MM-DD");

  const meds = await db
    .select()
    .from(medicines)
    .where(and(eq(medicines.userId, user.id), eq(medicines.active, true)));

  // If any medicine was created with a future server date (container clock skew), align it to the client's date
  for (const m of meds) {
    if (m.startDate > date) {
      const newEnd = endDateFor(date, m.durationDays);
      m.startDate = date;
      m.endDate = newEnd;
      await db.update(medicines).set({ startDate: date, endDate: newEnd }).where(eq(medicines.id, m.id));
    }
  }

  const logs = await db
    .select()
    .from(doseLogs)
    .where(and(eq(doseLogs.userId, user.id), eq(doseLogs.doseDate, date)));
  const logMap = new Map(logs.map((l) => [`${l.medicineId}|${l.doseTime}`, l]));

  const doses: DoseItem[] = [];
  for (const m of meds) {
    if (m.asNeeded || !isActiveOn(m, date)) continue;
    for (const time of m.times) {
      const log = logMap.get(`${m.id}|${time}`);
      doses.push({
        key: `${m.id}|${date}|${time}`,
        medicineId: m.id,
        name: m.name,
        dosage: m.dosage,
        form: m.form,
        instructions: m.instructions,
        date,
        time,
        status: (log?.status as DoseStatus | undefined) ?? "pending",
        actedAt: log?.actedAt ? log.actedAt.toISOString() : null,
      });
    }
  }
  doses.sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
  return json({ doses });
}

/** POST /api/doses — mark a dose as taken / skipped / pending (undo). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await readJson<{ medicineId?: string; doseDate?: string; doseTime?: string; status?: string }>(req);
  if (!body) return badRequest("Invalid request body.");
  const { medicineId, doseDate, doseTime, status } = body;

  if (!medicineId || !isUuid(medicineId)) return badRequest("Invalid medicine.");
  if (!isValidDate(doseDate) || !isValidTime(doseTime)) return badRequest("Invalid dose date or time.");
  if (status !== "taken" && status !== "skipped" && status !== "pending") return badRequest("Invalid status.");

  const [med] = await db
    .select({ id: medicines.id })
    .from(medicines)
    .where(and(eq(medicines.id, medicineId), eq(medicines.userId, user.id)))
    .limit(1);
  if (!med) return notFound("Medicine not found");

  const actedAt = status === "pending" ? null : new Date();
  const [log] = await db
    .insert(doseLogs)
    .values({ userId: user.id, medicineId, doseDate, doseTime, status, actedAt })
    .onConflictDoUpdate({
      target: [doseLogs.medicineId, doseLogs.doseDate, doseLogs.doseTime],
      set: { status, actedAt },
    })
    .returning();
  return json({ log });
}
