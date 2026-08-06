import type { ClaimWithItems } from "@/lib/types";

export type MonthlyStaffSummary = {
  key: string;
  claimantName: string;
  email: string;
  claimCount: number;
  rewardTotal: number;
  transportTotal: number;
  grandTotal: number;
  pendingTotal: number;
};

export function summarizeClaimsByStaff(claims: ClaimWithItems[], targetMonth: string) {
  const summaries = new Map<string, MonthlyStaffSummary>();

  for (const claim of claims) {
    if (claim.targetMonth !== targetMonth) continue;
    const key = claim.userId || claim.email;
    const current = summaries.get(key) ?? {
      key,
      claimantName: claim.claimantName,
      email: claim.email,
      claimCount: 0,
      rewardTotal: 0,
      transportTotal: 0,
      grandTotal: 0,
      pendingTotal: 0,
    };
    current.claimCount += 1;
    current.rewardTotal += claim.rewardTotal;
    current.transportTotal += claim.transportTotal;
    current.grandTotal += claim.grandTotal;
    if (claim.status !== "paid") current.pendingTotal += claim.grandTotal;
    summaries.set(key, current);
  }

  return [...summaries.values()].sort((a, b) => a.claimantName.localeCompare(b.claimantName, "ja"));
}

export function listClaimMonths(claims: ClaimWithItems[], currentMonth: string) {
  return [...new Set([currentMonth, ...claims.map((claim) => claim.targetMonth)])]
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));
}
