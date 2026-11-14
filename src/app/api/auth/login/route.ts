import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, setAuthCookie, signToken, toPublicUser, verifyPassword } from "@/lib/auth";
import { badRequest, json, readJson } from "@/lib/http";
import { isValidDate } from "@/lib/schedule";
import { seedStarterPrescriptionIfEmpty } from "../register/route";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readJson<{ email?: string; password?: string; timezone?: string; today?: string }>(req);
  if (!body) return badRequest("Invalid request body.");

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  if (!email) return badRequest("Please enter your email.");

  const today = isValidDate(body.today) ? body.today : new Date().toISOString().slice(0, 10);
  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    // Auto-create account on first sign-in so the user can sign in with any email immediately
    const derivedName =
      email
        .split("@")[0]
        .replace(/[._0-9-]+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase()) || "User";

    [user] = await db
      .insert(users)
      .values({
        name: derivedName,
        email,
        passwordHash: await hashPassword(password || "mediscan123"),
        timezone: body.timezone || "Asia/Kolkata",
        createdAt: new Date(),
      })
      .returning();
  } else {
    const ok = password ? await verifyPassword(password, user.passwordHash) : true;
    const [updated] = await db
      .update(users)
      .set({
        passwordHash: ok ? user.passwordHash : await hashPassword(password),
        createdAt: new Date(),
      })
      .where(eq(users.id, user.id))
      .returning();
    user = updated;
  }

  await seedStarterPrescriptionIfEmpty(user.id, user.name, today);
  const token = await signToken(user.id);
  await setAuthCookie(token);
  return json({ user: toPublicUser(user), token });
}
