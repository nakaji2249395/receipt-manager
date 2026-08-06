import { NextResponse } from "next/server";
import { apiError } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { getSession } from "@/lib/session";
import { profileSchema } from "@/lib/validation";

async function currentUser() {
  const session = await getSession();
  if (session?.role !== "staff" || !session.userId) return null;
  return getRepository().getUserById(session.userId);
}

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, bank: user.bank } });
}

export async function PATCH(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    const input = profileSchema.parse(await request.json());
    await getRepository().updateUser({ ...user, ...input, updatedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
