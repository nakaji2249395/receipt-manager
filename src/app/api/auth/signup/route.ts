import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { hashPassword } from "@/lib/password";
import { getRepository } from "@/lib/repository";
import { setSession } from "@/lib/session";
import { signupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = signupSchema.parse(await request.json());
    const repository = getRepository();
    if (await repository.findUserByEmail(input.email)) {
      return NextResponse.json({ error: "このメールアドレスは登録済みです" }, { status: 409 });
    }
    const password = hashPassword(input.password);
    const now = new Date().toISOString();
    const user = { id: randomUUID(), email: input.email, passwordHash: password.hash,
      passwordSalt: password.salt, name: input.name, bank: input.bank, createdAt: now, updatedAt: now };
    await repository.createUser(user);
    await setSession({ role: "staff", userId: user.id, email: user.email });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
