import { createRequire } from "node:module";
import fs from "node:fs";
import PDFDocument from "pdfkit";

const require = createRequire(import.meta.url);
const font = require.resolve("@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff");
const outputPath = new URL("../outputs/pdf-verification.pdf", import.meta.url);
const document = new PDFDocument({ size: "A4" });
document.pipe(fs.createWriteStream(outputPath));
document.registerFont("NotoSansJP", font);
document.font("NotoSansJP").fontSize(18).text("請求書　株式会社Deep session 御中");
document.fontSize(11).text("池袋駅 → 渋谷駅　交通費 ¥180");
document.end();

await new Promise((resolve, reject) => {
  document.on("end", resolve);
  document.on("error", reject);
});
