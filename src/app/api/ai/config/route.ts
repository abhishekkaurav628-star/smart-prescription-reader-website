import { getServerAiConfig, saveServerAiConfig } from "@/lib/ai-assistant";
import { getCurrentUser } from "@/lib/auth";
import { json, readJson, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

function maskKey(k: string): string {
  if (!k) return "";
  if (k.length <= 8) return "••••";
  return `${k.slice(0, 6)}••••${k.slice(-4)}`;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const cfg = getServerAiConfig(req.headers.get("x-ai-key"), req.headers.get("x-ai-provider"));
  return json({
    hasExternalKey: cfg.hasExternalKey,
    provider: cfg.provider,
    maskedKey: maskKey(cfg.apiKey),
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const body = await readJson<{ provider?: string; apiKey?: string }>(req);
  const cfg = saveServerAiConfig({
    provider: body?.provider ?? "auto",
    apiKey: body?.apiKey ?? "",
  });
  return json({
    ok: true,
    hasExternalKey: cfg.hasExternalKey,
    provider: cfg.provider,
    maskedKey: maskKey(cfg.apiKey),
  });
}
