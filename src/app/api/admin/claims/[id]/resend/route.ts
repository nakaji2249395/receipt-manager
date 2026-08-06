import { NextResponse } from "next/server";
import { sendClaimEmail } from "@/lib/mailer";
import { generateInvoicePdf } from "@/lib/pdf";
import { getRepository } from "@/lib/repository";
import { getSession } from "@/lib/session";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (session?.role !== "admin") return NextResponse.json({ error: "管理者ログインが必要です" }, { status: 401 });
  const { id } = await context.params;
  const repository = getRepository();
  const claim = await repository.getClaim(id);
  if (!claim) return NextResponse.json({ error: "請求が見つかりません" }, { status: 404 });
  try {
    await sendClaimEmail(claim, await generateInvoicePdf(claim));
    const now = new Date().toISOString();
    await repository.updateClaim({ ...claim, status: claim.status === "email_error" ? "pending" : claim.status,
      emailSentAt: now, errorMessage: "", updatedAt: now });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "再送に失敗しました" }, { status: 500 });
  }
}
