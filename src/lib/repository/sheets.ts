import { google, sheets_v4 } from "googleapis";
import { getGoogleAuth } from "../google";
import type { Repository } from "../repository";
import type { BankAccount, Claim, ClaimItem, ClaimWithItems, UserProfile } from "../types";

const USERS_HEADERS = [
  "user_id", "email", "password_hash", "password_salt", "name", "bank_name", "branch_name",
  "account_type", "account_number", "account_holder", "created_at", "updated_at",
];
const CLAIMS_HEADERS = [
  "claim_id", "invoice_number", "user_id", "email", "claimant_name", "claim_type", "target_month",
  "bank_name", "branch_name", "account_type", "account_number", "account_holder", "reward_total",
  "transport_total", "grand_total", "status", "drive_file_id", "drive_file_url", "email_sent_at",
  "error_message", "submitted_at", "paid_at", "updated_at",
];
const ITEMS_HEADERS = [
  "item_id", "claim_id", "event_date", "location", "reward_amount", "departure_station",
  "arrival_station", "transport_amount",
];

function bankFrom(row: string[], offset: number): BankAccount {
  return {
    bankName: row[offset] || "",
    branchName: row[offset + 1] || "",
    accountType: row[offset + 2] === "当座" ? "当座" : "普通",
    accountNumber: row[offset + 3] || "",
    accountHolder: row[offset + 4] || "",
  };
}

function userToRow(user: UserProfile) {
  return [user.id, user.email, user.passwordHash, user.passwordSalt, user.name, user.bank.bankName,
    user.bank.branchName, user.bank.accountType, user.bank.accountNumber, user.bank.accountHolder,
    user.createdAt, user.updatedAt];
}

function rowToUser(row: string[]): UserProfile {
  return { id: row[0], email: row[1], passwordHash: row[2], passwordSalt: row[3], name: row[4],
    bank: bankFrom(row, 5), createdAt: row[10], updatedAt: row[11] };
}

function claimToRow(claim: Claim) {
  return [claim.id, claim.invoiceNumber, claim.userId, claim.email, claim.claimantName, claim.type,
    claim.targetMonth, claim.bank.bankName, claim.bank.branchName, claim.bank.accountType,
    claim.bank.accountNumber, claim.bank.accountHolder, claim.rewardTotal, claim.transportTotal,
    claim.grandTotal, claim.status, claim.driveFileId, claim.driveFileUrl, claim.emailSentAt,
    claim.errorMessage, claim.submittedAt, claim.paidAt, claim.updatedAt];
}

function rowToClaim(row: string[]): Claim {
  return { id: row[0], invoiceNumber: row[1], userId: row[2], email: row[3], claimantName: row[4],
    type: row[5] === "monthly" ? "monthly" : "single", targetMonth: row[6], bank: bankFrom(row, 7),
    rewardTotal: Number(row[12] || 0), transportTotal: Number(row[13] || 0), grandTotal: Number(row[14] || 0),
    status: ["paid", "email_error", "processing_error"].includes(row[15]) ? row[15] as Claim["status"] : "pending",
    driveFileId: row[16] || "", driveFileUrl: row[17] || "", emailSentAt: row[18] || "",
    errorMessage: row[19] || "", submittedAt: row[20] || "", paidAt: row[21] || "", updatedAt: row[22] || "" };
}

function itemToRow(item: ClaimItem) {
  return [item.id, item.claimId, item.eventDate, item.location, item.rewardAmount,
    item.departureStation, item.arrivalStation, item.transportAmount];
}

function rowToItem(row: string[]): ClaimItem {
  return { id: row[0], claimId: row[1], eventDate: row[2], location: row[3], rewardAmount: Number(row[4] || 0),
    departureStation: row[5], arrivalStation: row[6], transportAmount: Number(row[7] || 0) };
}

export class SheetsRepository implements Repository {
  private sheets: sheets_v4.Sheets;
  private id: string;
  private initialized: Promise<void> | null = null;

  constructor() {
    if (!process.env.GOOGLE_SHEET_ID) throw new Error("GOOGLE_SHEET_IDが設定されていません");
    this.id = process.env.GOOGLE_SHEET_ID;
    this.sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });
  }

  private ensure() {
    if (!this.initialized) this.initialized = this.initialize();
    return this.initialized;
  }

  private async initialize() {
    const metadata = await this.sheets.spreadsheets.get({ spreadsheetId: this.id });
    const names = new Set(metadata.data.sheets?.map((sheet) => sheet.properties?.title));
    const missing = ["Users", "Claims", "Items"].filter((name) => !names.has(name));
    if (missing.length) {
      await this.sheets.spreadsheets.batchUpdate({ spreadsheetId: this.id,
        requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) } });
    }
    for (const [name, headers] of [["Users", USERS_HEADERS], ["Claims", CLAIMS_HEADERS], ["Items", ITEMS_HEADERS]] as const) {
      const current = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.id, range: `${name}!1:1` });
      if (!current.data.values?.length) {
        await this.sheets.spreadsheets.values.update({ spreadsheetId: this.id, range: `${name}!A1`,
          valueInputOption: "RAW", requestBody: { values: [headers] } });
      }
    }
  }

  private async rows(tab: string) {
    await this.ensure();
    const result = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.id, range: `${tab}!A2:Z` });
    return (result.data.values || []) as string[][];
  }

  private async append(tab: string, values: Array<Array<string | number>>) {
    await this.ensure();
    await this.sheets.spreadsheets.values.append({ spreadsheetId: this.id, range: `${tab}!A:Z`,
      valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values } });
  }

  private async replace(tab: string, id: string, row: Array<string | number>) {
    const rows = await this.rows(tab);
    const index = rows.findIndex((candidate) => candidate[0] === id);
    if (index < 0) throw new Error(`${tab}の対象行が見つかりません`);
    await this.sheets.spreadsheets.values.update({ spreadsheetId: this.id, range: `${tab}!A${index + 2}`,
      valueInputOption: "RAW", requestBody: { values: [row] } });
  }

  async findUserByEmail(email: string) {
    return (await this.rows("Users")).map(rowToUser).find((user) => user.email === email) || null;
  }
  async getUserById(id: string) {
    return (await this.rows("Users")).map(rowToUser).find((user) => user.id === id) || null;
  }
  createUser(user: UserProfile) { return this.append("Users", [userToRow(user)]); }
  updateUser(user: UserProfile) { return this.replace("Users", user.id, userToRow(user)); }
  async createClaim(claim: Claim, items: ClaimItem[]) {
    await this.append("Claims", [claimToRow(claim)]);
    await this.append("Items", items.map(itemToRow));
  }
  async getClaim(id: string) {
    const [claims, items] = await Promise.all([this.rows("Claims"), this.rows("Items")]);
    const claim = claims.map(rowToClaim).find((candidate) => candidate.id === id);
    return claim ? { ...claim, items: items.map(rowToItem).filter((item) => item.claimId === id) } : null;
  }
  async listClaimsForUser(userId: string) {
    return (await this.listClaims()).filter((claim) => claim.userId === userId);
  }
  async listClaims(): Promise<ClaimWithItems[]> {
    const [claimRows, itemRows] = await Promise.all([this.rows("Claims"), this.rows("Items")]);
    const items = itemRows.map(rowToItem);
    return claimRows.map(rowToClaim).map((claim) => ({ ...claim, items: items.filter((item) => item.claimId === claim.id) }))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }
  updateClaim(claim: Claim) { return this.replace("Claims", claim.id, claimToRow(claim)); }
}
