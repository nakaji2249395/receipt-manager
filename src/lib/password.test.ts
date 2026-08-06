import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("正しいパスワードだけを検証する", () => {
    const result = hashPassword("safe-password-123");
    expect(verifyPassword("safe-password-123", result.salt, result.hash)).toBe(true);
    expect(verifyPassword("wrong-password", result.salt, result.hash)).toBe(false);
  });
});
