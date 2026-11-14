import path from "node:path";
import { createWorker } from "tesseract.js";
import {
  generateLocalAiInsights,
  getServerAiConfig,
  runExternalAiVision,
} from "@/lib/ai-assistant";
import { getCurrentUser } from "@/lib/auth";
import { badRequest, json, readJson, unauthorized } from "@/lib/http";
import { normalizeOcr, parsePrescription } from "@/lib/parser";

export const dynamic = "force-dynamic";

function dataUrlToBuffer(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/[\w.+-]+;base64,/, "");
  return Buffer.from(base64, "base64");
}

async function recognizeBuffer(buf: Buffer): Promise<string> {
  const workerPath = path.join(process.cwd(), "node_modules", "tesseract.js", "src", "worker-script", "node", "index.js");

  const worker = await createWorker("eng", 1, {
    workerPath,
  });
  try {
    await worker.setParameters({ preserve_interword_spaces: "1" });
    const { data } = await worker.recognize(buf);
    return data.text ?? "";
  } finally {
    await worker.terminate();
  }
}

/**
 * POST /api/ocr
 * 1. If an external Vision AI key (Claude / Gemini / OpenAI / Groq) is configured,
 *    uses multimodal AI Vision to read doctor handwriting and generate clinical insights.
 * 2. Otherwise (or as fallback), runs multi-pass local Tesseract OCR + Handwriting Normalizer +
 *    Built-in Clinical AI Engine.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await readJson<{
    image?: string;
    enhancedImage?: string;
    apiKey?: string;
    provider?: string;
    preferAi?: boolean;
  }>(req);

  if (!body?.image && !body?.enhancedImage) {
    return badRequest("An image is required.");
  }

  const primaryDataUrl = body.image ?? body.enhancedImage!;
  const cfg = getServerAiConfig(body.apiKey ?? req.headers.get("x-ai-key"), body.provider ?? req.headers.get("x-ai-provider"));

  // Try external AI Vision first when an API key is configured
  if (cfg.hasExternalKey && cfg.provider !== "builtin" && body.preferAi !== false) {
    try {
      const aiResult = await runExternalAiVision(primaryDataUrl, cfg.provider, cfg.apiKey, body.enhancedImage);
      if (aiResult.parsed.medicines.length > 0) {
        return json({
          text: aiResult.rawText,
          parsed: aiResult.parsed,
          insights: aiResult.insights,
          engineUsed: aiResult.insights.engineUsed,
        });
      }
    } catch {
      /* Fall back to local OCR + Handwriting AI pipeline below */
    }
  }

  try {
    const primaryBuf = dataUrlToBuffer(primaryDataUrl);
    let rawOcr = await recognizeBuffer(primaryBuf);
    let normalized = normalizeOcr(rawOcr);
    let parsed = parsePrescription(normalized);

    if (body.enhancedImage && body.image && parsed.medicines.length < 2) {
      const enhancedBuf = dataUrlToBuffer(body.enhancedImage);
      const rawOcr2 = await recognizeBuffer(enhancedBuf);
      const normalized2 = normalizeOcr(rawOcr2);
      const parsed2 = parsePrescription(normalized2);
      if (
        parsed2.medicines.length > parsed.medicines.length ||
        (parsed2.medicines.length === parsed.medicines.length && normalized2.trim().length > normalized.trim().length)
      ) {
        rawOcr = rawOcr2;
        normalized = normalized2;
        parsed = parsed2;
      }
    }

    const insights = generateLocalAiInsights(parsed, normalized, "MediScan Handwriting OCR + Clinical AI");
    return json({
      text: normalized,
      parsed,
      insights,
      engineUsed: insights.engineUsed,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to read image";
    return json({ error: msg }, 500);
  }
}
