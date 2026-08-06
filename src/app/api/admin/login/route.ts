import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { checkLoginRateLimit, clearLoginRateLimit } from "@/lib/rate-limit";
import { setSession } from "@/lib/session";
import { adminLoginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const key = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    if (!checkLoginRateLimit(key)) return NextResponse.json({ error: "試行回数が多すぎます。15分後にお試しください" }, { status: 429 });
    const input = adminLoginSchema.parse(await request.json());
    const expectedValue = process.env.ADMIN_PASSWORD;
    if (!expectedValue) return NextResponse.json({ error: "管理者パスワードが未設定です" }, { status: 503 });
    const actual = Buffer.from(input.password);
    const expected = Buffer.from(expectedValue);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return NextResponse.json({ error: "パスワードが違います" }, { status: 401 });
    }
    clearLoginRateLimit(key);
    await setSession({ role: "admin" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
