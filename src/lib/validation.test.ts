import { describe, expect, it } from "vitest";
import { claimSchema } from "./validation";

const item = { eventDate: "2026-08-01", location: "池袋", rewardAmount: 10000,
  departureStation: "新宿駅", arrivalStation: "池袋駅", transportAmount: 180 };

describe("claimSchema", () => {
  it("同日複数イベントを月まとめで受け付ける", () => {
    expect(claimSchema.safeParse({ type: "monthly", targetMonth: "2026-08", items: [item, item] }).success).toBe(true);
  });
  it("単発請求は1イベントに限定する", () => {
    expect(claimSchema.safeParse({ type: "single", targetMonth: "2026-08", items: [item, item] }).success).toBe(false);
  });
  it("対象月と違う出勤日を拒否する", () => {
    expect(claimSchema.safeParse({ type: "monthly", targetMonth: "2026-09", items: [item] }).success).toBe(false);
  });
});
