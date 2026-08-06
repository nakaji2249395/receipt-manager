import { describe, expect, it } from "vitest";
import { listClaimMonths, summarizeClaimsByStaff } from "./monthly-summary";
import type { ClaimWithItems } from "./types";

function claim(overrides: Partial<ClaimWithItems>): ClaimWithItems {
  return {
    id: "claim-1", invoiceNumber: "INV-1", userId: "user-1", email: "staff@example.com", claimantName: "山田 花子",
    type: "single", targetMonth: "2026-08",
    bank: { bankName: "銀行", branchName: "支店", accountType: "普通", accountNumber: "1234567", accountHolder: "ヤマダ ハナコ" },
    rewardTotal: 10_000, transportTotal: 1_000, grandTotal: 11_000, status: "pending",
    driveFileId: "", driveFileUrl: "", emailSentAt: "", errorMessage: "", submittedAt: "2026-08-01T00:00:00Z",
    paidAt: "", updatedAt: "2026-08-01T00:00:00Z", items: [], ...overrides,
  };
}

describe("summarizeClaimsByStaff", () => {
  it("同じスタッフの同月の追加請求を合算し、未対応額だけを分ける", () => {
    const claims = [
      claim({ id: "1" }),
      claim({ id: "2", rewardTotal: 20_000, transportTotal: 2_000, grandTotal: 22_000, status: "paid" }),
      claim({ id: "3", userId: "user-2", email: "other@example.com", claimantName: "佐藤 太郎", grandTotal: 5_000 }),
      claim({ id: "4", targetMonth: "2026-07", grandTotal: 99_000 }),
    ];
    const result = summarizeClaimsByStaff(claims, "2026-08");
    expect(result).toHaveLength(2);
    expect(result.find((row) => row.key === "user-1")).toMatchObject({
      claimCount: 2, rewardTotal: 30_000, transportTotal: 3_000, grandTotal: 33_000, pendingTotal: 11_000,
    });
  });
});

describe("listClaimMonths", () => {
  it("現在月を含めて新しい順に重複なく返す", () => {
    expect(listClaimMonths([claim({ targetMonth: "2026-07" }), claim({ targetMonth: "2026-09" })], "2026-08"))
      .toEqual(["2026-09", "2026-08", "2026-07"]);
  });
});
