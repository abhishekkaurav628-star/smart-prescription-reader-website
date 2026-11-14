import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { medicines, prescriptions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { isUuid, json, notFound, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const [rx] = await db
    .select()
    .from(prescriptions)
    .where(and(eq(prescriptions.id, id), eq(prescriptions.userId, user.id)))
    .limit(1);
  if (!rx) return notFound("Prescription not found");
  const meds = await db.select().from(medicines).where(eq(medicines.prescriptionId, id));
  return json({ prescription: rx, medicines: meds });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  await db.delete(prescriptions).where(and(eq(prescriptions.id, id), eq(prescriptions.userId, user.id)));
  return json({ ok: true });
}
