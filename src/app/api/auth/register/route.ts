import { eq } from "drizzle-orm";
import { db } from "@/db";
import { medicines, prescriptions, users } from "@/db/schema";
import { hashPassword, setAuthCookie, signToken, toPublicUser } from "@/lib/auth";
import { badRequest, json, readJson } from "@/lib/http";
import { SAMPLE_PRESCRIPTION } from "@/lib/parser";
import { endDateFor, isValidDate } from "@/lib/schedule";

export const dynamic = "force-dynamic";

function validTimezone(tz: unknown): tz is string {
  if (typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function seedStarterPrescriptionIfEmpty(userId: string, patientName: string, today: string) {
  const existing = await db.select({ id: medicines.id }).from(medicines).where(eq(medicines.userId, userId)).limit(1);
  if (existing.length > 0) return;

  await db.transaction(async (tx) => {
    const [rx] = await tx
      .insert(prescriptions)
      .values({
        userId,
        doctorName: "Dr. Ananya Sharma",
        patientName,
        diagnosis: "Viral fever with throat infection",
        issuedOn: today,
        rawText: SAMPLE_PRESCRIPTION,
        source: "ocr-tesseract",
      })
      .returning();

    const seedMeds = [
      {
        name: "Dolo 650",
        dosage: "650 mg",
        form: "Tablet",
        instructions: "After food",
        purpose: "Fever & mild pain",
        times: ["08:00", "13:30", "20:30"],
        durationDays: 5,
      },
      {
        name: "Azithromycin",
        dosage: "500 mg",
        form: "Tablet",
        instructions: "Before food",
        purpose: "Bacterial infections (antibiotic)",
        times: ["08:00"],
        durationDays: 3,
      },
      {
        name: "Pantoprazole",
        dosage: "40 mg",
        form: "Capsule",
        instructions: "On empty stomach",
        purpose: "Acidity & GERD",
        times: ["08:00"],
        durationDays: 10,
      },
      {
        name: "Ascoril",
        dosage: "5 ml",
        form: "Syrup",
        instructions: "After food",
        purpose: "Cough (expectorant syrup)",
        times: ["08:00", "13:30", "20:30"],
        durationDays: 5,
      },
      {
        name: "Cetirizine",
        dosage: "10 mg",
        form: "Tablet",
        instructions: "At bedtime",
        purpose: "Allergy & cold",
        times: ["20:30"],
        durationDays: 5,
      },
    ];

    await tx.insert(medicines).values(
      seedMeds.map((m) => ({
        userId,
        prescriptionId: rx.id,
        name: m.name,
        dosage: m.dosage,
        form: m.form,
        instructions: m.instructions,
        purpose: m.purpose,
        times: m.times,
        asNeeded: false,
        startDate: today,
        durationDays: m.durationDays,
        endDate: endDateFor(today, m.durationDays),
      })),
    );
  });
}

export async function POST(req: Request) {
  const body = await readJson<{ name?: string; email?: string; password?: string; timezone?: string; today?: string }>(req);
  if (!body) return badRequest("Invalid request body.");

  const email = body.email?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@")) return badRequest("Please enter a valid email address.");

  const rawName = body.name?.trim() ?? "";
  const fallbackName = email
    .split("@")[0]
    .replace(/[._0-9-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "User";
  const name = rawName.length >= 1 ? rawName.slice(0, 80) : fallbackName;

  const password = body.password && body.password.length >= 1 ? body.password : "mediscan123";
  const today = isValidDate(body.today) ? body.today : new Date().toISOString().slice(0, 10);

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        name: rawName.length >= 1 ? name : existing.name,
        passwordHash: await hashPassword(password),
        timezone: validTimezone(body.timezone) ? body.timezone : existing.timezone,
        createdAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning();

    await seedStarterPrescriptionIfEmpty(updated.id, updated.name, today);
    const token = await signToken(updated.id);
    await setAuthCookie(token);
    return json({ user: toPublicUser(updated), token }, 200);
  }

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: await hashPassword(password),
      timezone: validTimezone(body.timezone) ? body.timezone : "Asia/Kolkata",
      createdAt: new Date(),
    })
    .returning();

  await seedStarterPrescriptionIfEmpty(user.id, user.name, today);
  const token = await signToken(user.id);
  await setAuthCookie(token);
  return json({ user: toPublicUser(user), token }, 201);
}
