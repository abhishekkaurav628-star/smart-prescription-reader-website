import { getCurrentUser } from "@/lib/auth";
import { badRequest, json, readJson, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET — tells the UI whether the optional Google Cloud Vision fallback is configured. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return json({ configured: Boolean(process.env.GOOGLE_CLOUD_VISION_API_KEY) });
}

/** POST { image: base64 } — optional OCR fallback using Google Cloud Vision (DOCUMENT_TEXT_DETECTION). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const key = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!key) return json({ error: "Google Cloud Vision is not configured on this server." }, 501);

  const body = await readJson<{ image?: string }>(req);
  const image = body?.image?.replace(/^data:image\/\w+;base64,/, "");
  if (!image) return badRequest("An image is required.");
  if (image.length > 12_000_000) return badRequest("Image is too large.");

  const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [{ image: { content: image }, features: [{ type: "DOCUMENT_TEXT_DETECTION" }], imageContext: { languageHints: ["en"] } }],
    }),
  });
  if (!res.ok) return json({ error: `Google Cloud Vision request failed (${res.status}).` }, 502);

  const data = (await res.json()) as { responses?: { fullTextAnnotation?: { text?: string }; error?: { message?: string } }[] };
  const first = data.responses?.[0];
  if (first?.error) return json({ error: first.error.message ?? "Vision API error." }, 502);
  return json({ text: first?.fullTextAnnotation?.text ?? "" });
}
