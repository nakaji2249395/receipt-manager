import { NextResponse } from "next/server";
import { generateInvoicePdf } from "@/lib/pdf";
import { getRepository } from "@/lib/repository";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const { id } = await context.params;
  const claim = await getRepository().getClaim(id);
  if (!claim || (session?.role !== "admin" && session?.userId !== claim.userId)) {
    return NextResponse.json({ error: "閲覧できません" }, { status: 403 });
  }
  const pdf = await generateInvoicePdf(claim);
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${claim.invoiceNumber}.pdf"` },
  });
}
