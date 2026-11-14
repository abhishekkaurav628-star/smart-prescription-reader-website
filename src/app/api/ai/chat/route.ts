import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { medicines, prescriptions } from "@/db/schema";
import { answerMedicalQuestion, getServerAiConfig } from "@/lib/ai-assistant";
import { getCurrentUser } from "@/lib/auth";
import { badRequest, json, readJson, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await readJson<{
    question?: string;
    context?: string;
    apiKey?: string;
    provider?: string;
  }>(req);

  const question = body?.question?.trim();
  if (!question) return badRequest("Please enter a question.");

  let context = body?.context?.trim() ?? "";
  if (!context) {
    const userMeds = await db
      .select()
      .from(medicines)
      .where(eq(medicines.userId, user.id))
      .orderBy(desc(medicines.createdAt))
      .limit(15);
    const [latestRx] = await db
      .select()
      .from(prescriptions)
      .where(eq(prescriptions.userId, user.id))
      .orderBy(desc(prescriptions.createdAt))
      .limit(1);

    const medSummary = userMeds
      .map(
        (m) =>
          `- ${m.name} (${m.dosage ?? "dose as prescribed"}, ${m.form ?? "Tablet"}): ${
            m.asNeeded ? "SOS / As needed" : `Scheduled at ${m.times.join(", ")}`
          }${m.durationDays ? ` for ${m.durationDays} days` : ""}${m.instructions ? ` (${m.instructions})` : ""}`,
      )
      .join("\n");

    context = [
      latestRx?.doctorName ? `Doctor: ${latestRx.doctorName}` : "",
      latestRx?.patientName ? `Patient: ${latestRx.patientName}` : `Patient: ${user.name}`,
      latestRx?.diagnosis ? `Diagnosis: ${latestRx.diagnosis}` : "",
      medSummary ? `Active Medicines:\n${medSummary}` : "",
      latestRx?.rawText ? `Prescription Text:\n${latestRx.rawText}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const cfg = getServerAiConfig(body?.apiKey ?? req.headers.get("x-ai-key"), body?.provider ?? req.headers.get("x-ai-provider"));
  const result = await answerMedicalQuestion({
    question,
    prescriptionContext: context,
    provider: cfg.provider,
    apiKey: cfg.apiKey,
  });

  return json(result);
}
