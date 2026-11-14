import { eq } from "drizzle-orm";
import { db } from "@/db";
import { medicines, prescriptions, users } from "@/db/schema";
import { hashPassword, setAuthCookie, signToken, toPublicUser } from "@/lib/auth";
import { json, readJson } from "@/lib/http";
import { SAMPLE_PRESCRIPTION } from "@/lib/parser";
import { endDateFor, isValidDate } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const DEMO_EMAIL = "demo@mediscan.app";

export async function POST(req: Request) {
  const body = await readJson<{ today?: string }>(req);
  const today = isValidDate(body?.today) ? body.today : new Date().toISOString().slice(0, 10);

  let [user] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        name: "Rahul Verma (Demo)",
        email: DEMO_EMAIL,
        passwordHash: await hashPassword("mediscan-demo-pass"),
        timezone: "Asia/Kolkata",
        createdAt: new Date(),
      })
      .returning();
  } else {
    [user] = await db
      .update(users)
      .set({ createdAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
  }

  const existingMeds = await db.select().from(medicines).where(eq(medicines.userId, user.id));

  if (existingMeds.length === 0) {
    await db.transaction(async (tx) => {
      const [rx] = await tx
        .insert(prescriptions)
        .values({
          userId: user.id,
          doctorName: "Dr. Ananya Sharma",
          patientName: "Rahul Verma",
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
          userId: user.id,
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
  } else {
    // Ensure demo medicines are active for the client's local date
    for (const m of existingMeds) {
      if (m.startDate > today || (m.endDate && m.endDate < today)) {
        await db
          .update(medicines)
          .set({
            startDate: today,
            endDate: endDateFor(today, m.durationDays ?? 7),
            active: true,
          })
          .where(eq(medicines.id, m.id));
      }
    }
  }

  const token = await signToken(user.id);
  await setAuthCookie(token);
  return json({ user: toPublicUser(user), token });
}
