import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { getRepository } from "@/lib/repository";
import { setSession } from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await getRepository().findUserByEmail(input.email);
    if (!user || !verifyPassword(input.password, user.passwordSalt, user.passwordHash)) {
      return NextResponse.json({ error: "メールアドレスまたはパスワードが違います" }, { status: 401 });
    }
    await setSession({ role: "staff", userId: user.id, email: user.email });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
