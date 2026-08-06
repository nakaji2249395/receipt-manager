import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

type SessionPayload = {
  role: "staff" | "admin";
  userId?: string;
  email?: string;
  expiresAt: number;
};

const COOKIE_NAME = "receipt_session";

function secret() {
  return process.env.APP_SECRET || "local-development-secret-change-before-production";
}

function encode(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function decode(value: string): SessionPayload | null {
  const [body, signature] = value.split(".");
  if (!body || !signature) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
  return payload.expiresAt > Date.now() ? payload : null;
}

export async function getSession() {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return value ? decode(value) : null;
}

export async function setSession(payload: Omit<SessionPayload, "expiresAt">) {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 14;
  const store = await cookies();
  store.set(COOKIE_NAME, encode({ ...payload, expiresAt }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
