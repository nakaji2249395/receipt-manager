import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = new URL("../outputs/sheet-template/", import.meta.url);
await fs.mkdir(outputDir, { recursive: true });

const workbook = Workbook.create();
const readme = workbook.worksheets.add("README");
const users = workbook.worksheets.add("Users");
const claims = workbook.worksheets.add("Claims");
const items = workbook.worksheets.add("Items");

readme.getRange("A1:F1").merge();
readme.getRange("A1").values = [["Deep session 支払い請求 管理データ"]];
readme.getRange("A3:B8").values = [
  ["項目", "内容"],
  ["Users", "スタッフのアカウント・振込先（パスワードは復元できないハッシュのみ）"],
  ["Claims", "請求単位の金額・支払状況・PDFリンク"],
  ["Items", "イベントごとの出勤日・場所・報酬・出発駅・到着駅・交通費"],
  ["注意", "列名とタブ名はアプリが利用するため変更しないでください"],
  ["保存先", "スタッフ支払い請求書フォルダ"],
];
readme.getRange("A1:F1").format = { fill: "#123C3B", font: { bold: true, color: "#FFFFFF", size: 16 }, verticalAlignment: "center" };
readme.getRange("A1:F1").format.rowHeight = 34;
readme.getRange("A3:B3").format = { fill: "#E8EEEE", font: { bold: true, color: "#162326" }, borders: { preset: "outside", style: "thin", color: "#D7E1E1" } };
readme.getRange("A4:B8").format.borders = { preset: "inside", style: "thin", color: "#E4EAEA" };
readme.getRange("A3:A8").format.columnWidth = 18;
readme.getRange("B3:B8").format.columnWidth = 78;
readme.getRange("B3:B8").format.wrapText = true;
readme.showGridLines = false;

const usersHeaders = ["user_id", "email", "password_hash", "password_salt", "name", "bank_name", "branch_name", "account_type", "account_number", "account_holder", "created_at", "updated_at"];
const claimsHeaders = ["claim_id", "invoice_number", "user_id", "email", "claimant_name", "claim_type", "target_month", "bank_name", "branch_name", "account_type", "account_number", "account_holder", "reward_total", "transport_total", "grand_total", "status", "drive_file_id", "drive_file_url", "email_sent_at", "error_message", "submitted_at", "paid_at", "updated_at"];
const itemsHeaders = ["item_id", "claim_id", "event_date", "location", "reward_amount", "departure_station", "arrival_station", "transport_amount"];

for (const [sheet, headers] of [[users, usersHeaders], [claims, claimsHeaders], [items, itemsHeaders]]) {
  sheet.getRangeByIndexes(0, 0, 1, headers.length).values = [headers];
  sheet.getRangeByIndexes(0, 0, 1, headers.length).format = {
    fill: "#E8EEEE",
    font: { bold: true, color: "#162326" },
    borders: { preset: "outside", style: "thin", color: "#D7E1E1" },
    verticalAlignment: "center",
  };
  sheet.getRangeByIndexes(0, 0, 1, headers.length).format.rowHeight = 27;
  sheet.getRangeByIndexes(0, 0, 1, headers.length).format.columnWidth = 18;
  sheet.getRange("A:A").format.columnWidth = 28;
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = false;
}
users.getRange("B:B").format.columnWidth = 30;
users.getRange("C:D").format.columnWidth = 38;
claims.getRange("B:B").format.columnWidth = 28;
claims.getRange("D:E").format.columnWidth = 24;
claims.getRange("R:R").format.columnWidth = 42;
claims.getRange("T:T").format.columnWidth = 36;
items.getRange("D:D").format.columnWidth = 26;
items.getRange("F:G").format.columnWidth = 22;

for (const sheetName of ["README", "Users", "Claims", "Items"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(new URL(`${sheetName}.png`, outputDir), new Uint8Array(await preview.arrayBuffer()));
}

const inspection = await workbook.inspect({ kind: "workbook,sheet,table", maxChars: 6000, tableMaxRows: 10, tableMaxCols: 24 });
await fs.writeFile(new URL("inspection.ndjson", outputDir), inspection.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 100 }, summary: "formula error scan" });
await fs.writeFile(new URL("errors.ndjson", outputDir), errors.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(fileURLToPath(new URL("Deep-session-支払い請求管理.xlsx", outputDir)));
