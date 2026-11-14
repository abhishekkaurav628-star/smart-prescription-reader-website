import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { medicines } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { badRequest, isUuid, json, notFound, readJson, unauthorized } from "@/lib/http";
import { endDateFor } from "@/lib/schedule";
import { parseMedicineInput } from "@/lib/validators";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return notFound();

  const [existing] = await db
    .select()
    .from(medicines)
    .where(and(eq(medicines.id, id), eq(medicines.userId, user.id)))
    .limit(1);
  if (!existing) return notFound("Medicine not found");

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return badRequest("Invalid request body.");

  // Pause / resume only
  if (Object.keys(body).length === 1 && typeof body.active === "boolean") {
    const [row] = await db.update(medicines).set({ active: body.active }).where(eq(medicines.id, id)).returning();
    return json({ medicine: row });
  }

  const input = parseMedicineInput({ ...existing, ...body }, existing.startDate);
  if (typeof input === "string") return badRequest(input);

  const [row] = await db
    .update(medicines)
    .set({
      name: input.name,
      dosage: input.dosage,
      form: input.form,
      instructions: input.instructions,
      purpose: input.purpose,
      times: input.times,
      asNeeded: input.asNeeded,
      startDate: input.startDate,
      durationDays: input.durationDays,
      endDate: endDateFor(input.startDate, input.durationDays),
      active: typeof body.active === "boolean" ? body.active : existing.active,
    })
    .where(eq(medicines.id, id))
    .returning();
  return json({ medicine: row });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  await db.delete(medicines).where(and(eq(medicines.id, id), eq(medicines.userId, user.id)));
  return json({ ok: true });
}
