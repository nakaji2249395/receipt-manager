import { Readable } from "node:stream";
import { google } from "googleapis";
import { DRIVE_ROOT_FOLDER_ID } from "./constants";
import { getGoogleAuth } from "./google";

function escapeQuery(value: string) {
  return value.replace(/'/g, "\\'");
}

async function ensureFolder(name: string, parentId: string) {
  const drive = google.drive({ version: "v3", auth: getGoogleAuth() });
  const existing = await drive.files.list({
    q: `'${parentId}' in parents and name='${escapeQuery(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  if (existing.data.files?.[0]?.id) return existing.data.files[0].id;
  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
    supportsAllDrives: true,
  });
  if (!created.data.id) throw new Error(`${name}フォルダを作成できませんでした`);
  return created.data.id;
}

export async function uploadInvoicePdf(pdf: Buffer, targetMonth: string, type: "single" | "monthly", fileName: string) {
  const [year, month] = targetMonth.split("-");
  const yearFolder = await ensureFolder(year, DRIVE_ROOT_FOLDER_ID);
  const monthFolder = await ensureFolder(month, yearFolder);
  const typeFolder = await ensureFolder(type === "single" ? "単発" : "月まとめ", monthFolder);
  const drive = google.drive({ version: "v3", auth: getGoogleAuth() });
  const result = await drive.files.create({
    requestBody: { name: fileName, parents: [typeFolder] },
    media: { mimeType: "application/pdf", body: Readable.from(pdf) },
    fields: "id,webViewLink",
    supportsAllDrives: true,
  });
  if (!result.data.id) throw new Error("PDFをGoogle Driveへ保存できませんでした");
  return { id: result.data.id, url: result.data.webViewLink || `https://drive.google.com/file/d/${result.data.id}/view` };
}
