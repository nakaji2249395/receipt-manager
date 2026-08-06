import { z } from "zod";

const bankSchema = z.object({
  bankName: z.string().trim().min(1, "銀行名を入力してください").max(80),
  branchName: z.string().trim().min(1, "支店名を入力してください").max(80),
  accountType: z.enum(["普通", "当座"]),
  accountNumber: z.string().trim().regex(/^\d{5,8}$/, "口座番号は5〜8桁の数字で入力してください"),
  accountHolder: z.string().trim().min(1, "口座名義を入力してください").max(100),
});

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("メールアドレスを確認してください"),
  password: z.string().min(8, "パスワードは8文字以上にしてください").max(128),
  name: z.string().trim().min(1, "氏名を入力してください").max(80),
  bank: bankSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1, "氏名を入力してください").max(80),
  bank: bankSchema,
});

export const claimSchema = z
  .object({
    type: z.enum(["single", "monthly"]),
    targetMonth: z.string().regex(/^\d{4}-\d{2}$/, "対象月を選択してください"),
    items: z
      .array(
        z.object({
          eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "出勤日を入力してください"),
          location: z.string().trim().min(1, "出勤場所を入力してください").max(120),
          rewardAmount: z.number().int().min(0).max(10_000_000),
          departureStation: z.string().trim().min(1, "出発駅を入力してください").max(80),
          arrivalStation: z.string().trim().min(1, "到着駅を入力してください").max(80),
          transportAmount: z.number().int().min(0).max(1_000_000),
        }),
      )
      .min(1, "イベントを1件以上追加してください")
      .max(100),
  })
  .superRefine((value, ctx) => {
    if (value.type === "single" && value.items.length !== 1) {
      ctx.addIssue({ code: "custom", path: ["items"], message: "単発請求は1イベントずつ送信してください" });
    }
    value.items.forEach((item, index) => {
      if (!item.eventDate.startsWith(value.targetMonth)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "eventDate"],
          message: "出勤日は対象月と同じ月を選択してください",
        });
      }
    });
  });

export const adminLoginSchema = z.object({ password: z.string().min(1) });
