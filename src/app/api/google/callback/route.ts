import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeGoogleAuthorizationCode } from "@/lib/google";
import { getSession } from "@/lib/session";

const STATE_COOKIE = "google_oauth_state";

function sameValue(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] || character);
}

function resultPage(title: string, body: string, success = false) {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)}</title><style>body{margin:0;background:#f5f7f5;color:#162326;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif}.card{width:min(680px,calc(100% - 40px));margin:70px auto;padding:30px;box-sizing:border-box;border:1px solid #dce5e5;border-radius:16px;background:white}.mark{display:grid;place-items:center;width:42px;height:42px;border-radius:12px;background:${success ? "#0d6f68" : "#a23d2b"};color:white;font-weight:800}h1{font-size:25px;margin:20px 0 10px}p{line-height:1.8;color:#6b7a80}.token{display:block;width:100%;min-height:130px;margin:18px 0;padding:14px;box-sizing:border-box;border:1px solid #cfdada;border-radius:10px;word-break:break-all;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#162326}a{display:inline-flex;padding:12px 16px;border-radius:10px;background:#0d6f68;color:white;text-decoration:none;font-weight:700}</style></head><body><main class="card"><div class="mark">${success ? "✓" : "!"}</div>${body}</main></body></html>`;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (session?.role !== "admin") {
    return new NextResponse(resultPage("認証が必要です", "<h1>管理者ログインが必要です</h1><p>管理画面へログインしてから、もう一度Google連携を開始してください。</p><a href=\"/admin\">管理画面へ</a>"), { status: 401, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const store = await cookies();
  const expectedState = store.get(STATE_COOKIE)?.value;
  store.delete(STATE_COOKIE);

  if (error) {
    return new NextResponse(resultPage("Google連携がキャンセルされました", `<h1>Google連携を完了できませんでした</h1><p>${escapeHtml(error)}</p><a href="/admin/google">戻る</a>`), { status: 400, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }
  if (!code || !state || !expectedState || !sameValue(state, expectedState)) {
    return new NextResponse(resultPage("不正な認証結果です", "<h1>認証状態を確認できませんでした</h1><p>管理画面からGoogle連携をやり直してください。</p><a href=\"/admin/google\">戻る</a>"), { status: 400, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }

  try {
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI
      || new URL("/api/google/callback", request.url).toString();
    const refreshToken = await exchangeGoogleAuthorizationCode(redirectUri, code);
    const body = `<h1>Google連携用トークンを取得しました</h1><p>下の値を一度だけコピーし、<strong>GOOGLE_OAUTH_REFRESH_TOKEN</strong>としてVercelへ登録してください。この値は第三者へ共有しないでください。</p><textarea class="token" readonly onclick="this.select()">${escapeHtml(refreshToken)}</textarea><p>登録後はこの画面を閉じてください。</p><a href="/admin/google">Google連携画面へ戻る</a>`;
    return new NextResponse(resultPage("Google連携が完了しました", body, true), { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Google連携に失敗しました";
    return new NextResponse(resultPage("Google連携エラー", `<h1>Google連携に失敗しました</h1><p>${escapeHtml(message)}</p><a href="/admin/google">戻る</a>`), { status: 500, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }
}
