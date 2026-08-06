import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "管理者ログインが必要です" }, { status: 401 });
  return NextResponse.json({ claims: await getRepository().listClaims() });
}
