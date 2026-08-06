import { NextResponse } from "next/server";
import { submitClaim } from "@/lib/claims";
import { apiError } from "@/lib/http";
import { getRepository } from "@/lib/repository";
import { getSession } from "@/lib/session";
import { claimSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const session = await getSession();
  if (session?.role !== "staff" || !session.userId) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  return NextResponse.json({ claims: await getRepository().listClaimsForUser(session.userId) });
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (session?.role !== "staff" || !session.userId) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    const repository = getRepository();
    const user = await repository.getUserById(session.userId);
    if (!user) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    const input = claimSchema.parse(await request.json());
    const claim = await submitClaim(repository, user, input);
    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
