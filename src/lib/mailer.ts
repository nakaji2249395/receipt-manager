import { google } from "googleapis";
import { PAYMENT_ADMIN_EMAIL } from "./constants";
import { getGoogleAuth } from "./google";
import type { ClaimWithItems } from "./types";

function yen(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;
}

function wrapBase64(value: Buffer | string) {
  const encoded = Buffer.isBuffer(value)
    ? value.toString("base64")
    : Buffer.from(value, "utf8").toString("base64");
  return encoded.match(/.{1,76}/g)?.join("\r\n") || "";
}

function safeAsciiFileName(claim: ClaimWithItems) {
  return `${claim.invoiceNumber}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildClaimEmail(claim: ClaimWithItems, pdf: Buffer) {
  const user = process.env.GMAIL_USER || "deepsession.soumu@gmail.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const routeSummary = claim.items
    .map((item) => `${item.eventDate} ${item.departureStation} → ${item.arrivalStation} ${yen(item.transportAmount)}`)
    .join("\n");
  const text = `新しい支払い請求が提出されました。

請求者: ${claim.claimantName}
請求形式: ${claim.type === "single" ? "単発請求" : "月まとめ請求"}
対象月: ${claim.targetMonth}
イベント数: ${claim.items.length}件
報酬合計: ${yen(claim.rewardTotal)}
交通費合計: ${yen(claim.transportTotal)}
振込金額: ${yen(claim.grandTotal)}

振込先: ${claim.bank.bankName} ${claim.bank.branchName} ${claim.bank.accountType} ${claim.bank.accountNumber}
口座名義: ${claim.bank.accountHolder}

交通経路:
${routeSummary}

支払管理画面:
${appUrl}/admin/claims/${claim.id}

Google Drive:
${claim.driveFileUrl}`;
  const boundary = `deep-session-${crypto.randomUUID()}`;
  const subject = `【支払依頼】${claim.targetMonth} ${claim.claimantName} ${yen(claim.grandTotal)}`;
  const displayFileName = `${claim.invoiceNumber}_${claim.claimantName}.pdf`;
  const raw = [
    `From: ${encodeHeader("Deep session 総務")} <${user}>`,
    `To: ${PAYMENT_ADMIN_EMAIL}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(text),
    `--${boundary}`,
    `Content-Type: application/pdf; name="${safeAsciiFileName(claim)}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${safeAsciiFileName(claim)}"; filename*=UTF-8''${encodeURIComponent(displayFileName)}`,
    "",
    wrapBase64(pdf),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return Buffer.from(raw).toString("base64url");
}

export async function sendClaimEmail(claim: ClaimWithItems, pdf: Buffer) {
  const gmail = google.gmail({ version: "v1", auth: getGoogleAuth() });
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: buildClaimEmail(claim, pdf) },
  });
}
