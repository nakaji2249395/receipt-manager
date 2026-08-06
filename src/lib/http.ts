import { NextResponse } from "next/server";

export function apiError(error: unknown, fallback = "処理に失敗しました", status = 400) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}
