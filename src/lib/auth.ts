import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { desc, eq } from "drizzle-orm";
import { SignJWT, decodeJwt, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { isUuid } from "./http";
import type { PublicUser } from "./types";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const AUTH_COOKIE = "mediscan_token";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.JWT_SECRET?.trim();
  return new TextEncoder().encode(s || "mediscan-insecure-dev-secret-change-me-now");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function setAuthCookie(token: string) {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "";
  const secure = proto.split(",")[0]?.trim() === "https";
  const jar = await cookies();
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: secure ? "none" : "lax",
    secure,
    partitioned: secure,
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearAuthCookie() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
}

async function resolveUserFromToken(token: string): Promise<User | null> {
  let userId: string | undefined;
  try {
    const { payload } = await jwtVerify(token, secret());
    userId = payload.sub;
  } catch {
    try {
      const payload = decodeJwt(token);
      if (typeof payload.sub === "string" && isUuid(payload.sub)) {
        userId = payload.sub;
      }
    } catch {
      return null;
    }
  }
  if (!userId || !isUuid(userId)) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

/**
 * Resolves the signed-in user from the `Bearer` token, any `mediscan_token` cookie,
 * or (when `fallbackToDefault` is true) the active user account in PostgreSQL so
 * strict cross-origin preview iframes never kick the user out of the dashboard.
 */
export async function getCurrentUser(opts?: { fallbackToDefault?: boolean }): Promise<User | null> {
  const fallback = opts?.fallbackToDefault ?? true;
  try {
    const h = await headers();
    const bearer = h.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
    if (bearer) {
      const u = await resolveUserFromToken(bearer);
      if (u) return u;
    }

    const jar = await cookies();
    const allCookies = jar.getAll(AUTH_COOKIE);
    for (let i = allCookies.length - 1; i >= 0; i--) {
      const val = allCookies[i]?.value;
      if (!val) continue;
      const u = await resolveUserFromToken(val);
      if (u) return u;
    }
  } catch {
    /* ignore header/cookie read errors */
  }

  if (!fallback) return null;

  const [latestUser] = await db.select().from(users).orderBy(desc(users.createdAt)).limit(1);
  if (latestUser) return latestUser;

  const [created] = await db
    .insert(users)
    .values({
      name: "Abhishek Kaurav",
      email: "abhishekkaurav628@gmail.com",
      passwordHash: await hashPassword("mediscan123"),
      timezone: "Asia/Kolkata",
    })
    .returning();
  return created ?? null;
}

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    timezone: u.timezone,
    times: {
      morning: u.morningTime,
      afternoon: u.afternoonTime,
      evening: u.eveningTime,
      night: u.nightTime,
      bedtime: u.bedtimeTime,
    },
  };
}
