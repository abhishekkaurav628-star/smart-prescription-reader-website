import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { medicines } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { badRequest, json, readJson, unauthorized } from "@/lib/http";
import { endDateFor } from "@/lib/schedule";
import { parseMedicineInput } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const rows = await db.select().from(medicines).where(eq(medicines.userId, user.id)).orderBy(desc(medicines.createdAt));
  return json({ medicines: rows });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await readJson(req);
  const today = new Date().toISOString().slice(0, 10);
  const input = parseMedicineInput(body, today);
  if (typeof input === "string") return badRequest(input);

  const [row] = await db
    .insert(medicines)
    .values({
      userId: user.id,
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
    })
    .returning();
  return json({ medicine: row }, 201);
}
