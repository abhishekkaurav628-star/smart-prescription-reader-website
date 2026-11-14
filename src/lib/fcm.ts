import { SignJWT, importPKCS8 } from "jose";

/**
 * Firebase Cloud Messaging (HTTP v1) sender.
 * Enabled only when FIREBASE_SERVICE_ACCOUNT_JSON is configured.
 */
interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    if (!sa.project_id || !sa.client_email || !sa.private_key) return null;
    return { ...sa, private_key: sa.private_key.replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

export const fcmEnabled = () => loadServiceAccount() !== null;

let cached: { token: string; exp: number } | null = null;

async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const key = await importPKCS8(sa.private_key, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setSubject(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("55m")
    .sign(key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`Google OAuth failed (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/** Sends a data-only push to each token. Returns tokens that FCM reports as no longer valid. */
export async function sendPush(tokens: string[], payload: PushPayload): Promise<{ sent: number; invalid: string[] }> {
  const sa = loadServiceAccount();
  if (!sa || tokens.length === 0) return { sent: 0, invalid: [] };
  const bearer = await accessToken(sa);
  let sent = 0;
  const invalid: string[] = [];

  await Promise.all(
    tokens.map(async (token) => {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: {
            token,
            data: { title: payload.title, body: payload.body, url: payload.url ?? "/dashboard" },
            webpush: { headers: { Urgency: "high" } },
          },
        }),
      });
      if (res.ok) sent++;
      else if (res.status === 404 || res.status === 400) invalid.push(token);
    }),
  );
  return { sent, invalid };
}
