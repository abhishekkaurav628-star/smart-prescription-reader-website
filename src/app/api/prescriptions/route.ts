import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { medicines, prescriptions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { badRequest, json, readJson, unauthorized } from "@/lib/http";
import { endDateFor, isValidDate } from "@/lib/schedule";
import { parseMedicineInput, type MedicineInput } from "@/lib/validators";

export const dynamic = "force-dynamic";

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const rows = await db.select().from(prescriptions).where(eq(prescriptions.userId, user.id)).orderBy(desc(prescriptions.createdAt));
  const meds = rows.length
    ? await db.select({ id: medicines.id, name: medicines.name, prescriptionId: medicines.prescriptionId }).from(medicines).where(inArray(medicines.prescriptionId, rows.map((r) => r.id)))
    : [];
  return json({
    prescriptions: rows.map((r) => ({ ...r, medicines: meds.filter((m) => m.prescriptionId === r.id) })),
  });
}

/** POST /api/prescriptions — saves a reviewed prescription together with its medicines & reminder times. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return badRequest("Invalid request body.");

  const startDate = isValidDate(body.startDate) ? body.startDate : new Date().toISOString().slice(0, 10);
  const list = Array.isArray(body.medicines) ? body.medicines : [];
  if (list.length === 0) return badRequest("Add at least one medicine to save this prescription.");
  if (list.length > 40) return badRequest("Too many medicines in one prescription.");

  const parsed: MedicineInput[] = [];
  for (const raw of list) {
    const input = parseMedicineInput({ ...(raw as object), startDate }, startDate);
    if (typeof input === "string") return badRequest(input);
    parsed.push(input);
  }

  const source = ["ocr-tesseract", "ocr-vision", "text", "manual"].includes(String(body.source)) ? String(body.source) : "manual";

  const result = await db.transaction(async (tx) => {
    const [rx] = await tx
      .insert(prescriptions)
      .values({
        userId: user.id,
        doctorName: text(body.doctor, 120),
        patientName: text(body.patient, 120),
        diagnosis: text(body.diagnosis, 300),
        issuedOn: isValidDate(body.issuedOn) ? body.issuedOn : null,
        rawText: text(body.rawText, 20000),
        source,
      })
      .returning();
    const meds = await tx
      .insert(medicines)
      .values(
        parsed.map((m) => ({
          userId: user.id,
          prescriptionId: rx.id,
          name: m.name,
          dosage: m.dosage,
          form: m.form,
          instructions: m.instructions,
          purpose: m.purpose,
          times: m.times,
          asNeeded: m.asNeeded,
          startDate: m.startDate,
          durationDays: m.durationDays,
          endDate: endDateFor(m.startDate, m.durationDays),
        })),
      )
      .returning();
    return { prescription: rx, medicines: meds };
  });

  return json(result, 201);
}
