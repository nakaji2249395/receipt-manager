import path from "node:path";
import PDFDocument from "pdfkit";
import type { ClaimWithItems } from "./types";
import { COMPANY } from "./constants";

function yen(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function fontPath() {
  return path.join(
    process.cwd(),
    "node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff",
  );
}

export async function generateInvoicePdf(claim: ClaimWithItems): Promise<Buffer> {
  const document = new PDFDocument({ size: "A4", margin: 48, info: { Title: claim.invoiceNumber } });
  document.registerFont("NotoSansJP", fontPath());
  document.font("NotoSansJP");
  const chunks: Buffer[] = [];
  document.on("data", (chunk) => chunks.push(chunk));

  document.fontSize(25).text("請 求 書", { align: "center" });
  document.moveDown(1.4);
  document.fontSize(12).text(`${COMPANY.name} 御中`, 48, 115);
  document.fontSize(9).fillColor("#53616b").text(COMPANY.address, 48, 135);
  document.fillColor("#182026");
  document.fontSize(9).text(`請求書番号  ${claim.invoiceNumber}`, 350, 115, { width: 195, align: "right" });
  document.text(`発行日  ${new Date(claim.submittedAt).toLocaleDateString("ja-JP")}`, 350, 133, { width: 195, align: "right" });

  document.moveTo(48, 164).lineTo(547, 164).strokeColor("#d8e0e5").stroke();
  document.fontSize(10).fillColor("#53616b").text("請求者", 48, 181);
  document.fontSize(15).fillColor("#182026").text(claim.claimantName, 48, 199);
  document.fontSize(10).fillColor("#53616b").text("ご請求金額", 330, 181);
  document.fontSize(23).fillColor("#0b766e").text(yen(claim.grandTotal), 330, 198, { width: 217, align: "right" });

  let y = 254;
  const widths = [78, 142, 82, 125, 72];
  const headers = ["出勤日", "出勤場所", "報酬額", "交通経路", "交通費"];
  document.rect(48, y, 499, 25).fill("#183b3a");
  let x = 48;
  headers.forEach((header, index) => {
    document.fillColor("white").fontSize(8).text(header, x + 5, y + 8, { width: widths[index] - 10 });
    x += widths[index];
  });
  y += 25;

  for (const item of claim.items) {
    const rowHeight = 39;
    if (y + rowHeight > 650) {
      document.addPage();
      y = 55;
    }
    document.rect(48, y, 499, rowHeight).fill("#f5f8f8");
    x = 48;
    const cells = [
      new Date(`${item.eventDate}T00:00:00`).toLocaleDateString("ja-JP"), item.location, yen(item.rewardAmount),
      `${item.departureStation} - ${item.arrivalStation}`, yen(item.transportAmount),
    ];
    cells.forEach((cell, index) => {
      document.fillColor("#263238").fontSize(8).text(cell, x + 5, y + 9, {
        width: widths[index] - 10,
        align: index === 2 || index === 4 ? "right" : "left",
      });
      x += widths[index];
    });
    y += rowHeight + 2;
  }

  y += 10;
  document.fontSize(10).fillColor("#53616b").text("報酬合計", 340, y, { width: 110 });
  document.fillColor("#182026").text(yen(claim.rewardTotal), 450, y, { width: 97, align: "right" });
  y += 22;
  document.fillColor("#53616b").text("交通費合計", 340, y, { width: 110 });
  document.fillColor("#182026").text(yen(claim.transportTotal), 450, y, { width: 97, align: "right" });
  y += 22;
  document.fontSize(12).fillColor("#0b766e").text("合計", 340, y, { width: 110 });
  document.fontSize(14).text(yen(claim.grandTotal), 450, y - 2, { width: 97, align: "right" });

  y += 55;
  if (y > 690) { document.addPage(); y = 55; }
  document.fontSize(11).fillColor("#182026").text("お振込先", 48, y);
  document.moveTo(48, y + 19).lineTo(547, y + 19).strokeColor("#d8e0e5").stroke();
  document.fontSize(10).fillColor("#263238").text(
    `${claim.bank.bankName}　${claim.bank.branchName}　${claim.bank.accountType}　${claim.bank.accountNumber}`,
    48, y + 34,
  );
  document.text(`口座名義　${claim.bank.accountHolder}`, 48, y + 55);

  document.fontSize(8).fillColor("#7a878e").text(
    `${COMPANY.name} / ${COMPANY.address} / ${COMPANY.representative} / ${COMPANY.phone}`,
    48, 770, { width: 499, align: "center" },
  );

  document.end();
  await new Promise<void>((resolve, reject) => {
    document.on("end", resolve);
    document.on("error", reject);
  });
  return Buffer.concat(chunks);
}
