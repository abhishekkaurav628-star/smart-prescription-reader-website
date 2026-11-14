import { generateLocalAiInsights } from "@/lib/ai-assistant";
import { getCurrentUser } from "@/lib/auth";
import { badRequest, json, readJson, unauthorized } from "@/lib/http";
import { normalizeOcr, parsePrescription } from "@/lib/parser";

export const dynamic = "force-dynamic";

/** POST /api/parse { text } — NLP + Clinical AI step: turns prescription text into structured medicines and AI insights. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await readJson<{ text?: string }>(req);
  const text = body?.text?.trim();
  if (!text) return badRequest("No text to analyse.");
  if (text.length > 20000) return badRequest("Text is too long.");
  const normalized = normalizeOcr(text);
  const parsed = parsePrescription(normalized);
  const insights = generateLocalAiInsights(parsed, normalized, "MediScan Clinical AI");
  return json({ parsed, insights, normalizedText: normalized });
}
