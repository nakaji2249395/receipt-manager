import { randomUUID } from "node:crypto";
import { uploadInvoicePdf } from "./drive";
import { sendClaimEmail } from "./mailer";
import { generateInvoicePdf } from "./pdf";
import type { Claim, ClaimItem, ClaimWithItems, NewClaimInput, UserProfile } from "./types";
import type { Repository } from "./repository";

export async function submitClaim(repository: Repository, user: UserProfile, input: NewClaimInput) {
  const now = new Date().toISOString();
  const id = randomUUID();
  const items: ClaimItem[] = input.items.map((item) => ({ ...item, id: randomUUID(), claimId: id }));
  const rewardTotal = items.reduce((sum, item) => sum + item.rewardAmount, 0);
  const transportTotal = items.reduce((sum, item) => sum + item.transportAmount, 0);
  const invoiceNumber = `DS-${input.targetMonth.replace("-", "")}-${id.slice(0, 8).toUpperCase()}`;
  let claim: Claim = {
    id, invoiceNumber, userId: user.id, email: user.email, claimantName: user.name, type: input.type,
    targetMonth: input.targetMonth, bank: structuredClone(user.bank), rewardTotal, transportTotal,
    grandTotal: rewardTotal + transportTotal, status: "pending", driveFileId: "", driveFileUrl: "",
    emailSentAt: "", errorMessage: "", submittedAt: now, paidAt: "", updatedAt: now,
  };
  await repository.createClaim(claim, items);
  let hydrated: ClaimWithItems = { ...claim, items };

  if (process.env.SKIP_EXTERNAL_INTEGRATIONS === "true") {
    return hydrated;
  }

  try {
    const pdf = await generateInvoicePdf(hydrated);
    const drive = await uploadInvoicePdf(pdf, input.targetMonth, input.type, `${invoiceNumber}_${user.name}.pdf`);
    claim = { ...claim, driveFileId: drive.id, driveFileUrl: drive.url, updatedAt: new Date().toISOString() };
    await repository.updateClaim(claim);
    hydrated = { ...claim, items };
    try {
      await sendClaimEmail(hydrated, pdf);
      claim = { ...claim, emailSentAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    } catch (error) {
      claim = { ...claim, status: "email_error", errorMessage: error instanceof Error ? error.message : "メール送信エラー", updatedAt: new Date().toISOString() };
    }
  } catch (error) {
    claim = { ...claim, status: "processing_error", errorMessage: error instanceof Error ? error.message : "PDF処理エラー", updatedAt: new Date().toISOString() };
  }
  await repository.updateClaim(claim);
  return { ...claim, items };
}
