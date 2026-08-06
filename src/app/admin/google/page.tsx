import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function GoogleSettingsPage() {
  const session = await getSession();
  if (session?.role !== "admin") redirect("/admin");

  const clientConfigured = Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
  const tokenConfigured = Boolean(process.env.GOOGLE_OAUTH_REFRESH_TOKEN);

  return <main className="detail-shell"><header className="admin-header"><div className="brand"><span className="brand-mark">DS</span><span>Google Integration</span></div><Link className="ghost-button" href="/admin">← 管理画面へ戻る</Link></header><div className="detail-main"><div className="detail-heading"><div><p className="eyebrow dark">GOOGLE INTEGRATION</p><h1>Google連携</h1><p className="muted">Drive・スプレッドシート・Gmail APIを、総務Googleアカウントで連携します。</p></div></div><div className="detail-grid"><section className="form-card"><h2>連携手順</h2><ol className="setup-steps"><li><strong>OAuthクライアント情報を設定</strong><span>クライアントIDとシークレットを環境変数に登録します。</span></li><li><strong>Googleアカウントを認可</strong><span>Drive・Sheets・メール送信の3権限を確認して許可します。</span></li><li><strong>取得したトークンを保存</strong><span>表示された値をVercelの秘密環境変数へ登録します。</span></li></ol>{clientConfigured ? <a className="primary-button compact" href="/api/google/connect">Googleアカウントを連携する <span>→</span></a> : <p className="alert error">GOOGLE_OAUTH_CLIENT_IDとGOOGLE_OAUTH_CLIENT_SECRETが未設定です。</p>}</section><aside><section className="form-card"><h2>現在の設定</h2><dl className="info-list"><div><dt>OAuthクライアント</dt><dd><span className={`status ${clientConfigured ? "paid" : "processing_error"}`}>{clientConfigured ? "設定済み" : "未設定"}</span></dd></div><div><dt>リフレッシュトークン</dt><dd><span className={`status ${tokenConfigured ? "paid" : "pending"}`}>{tokenConfigured ? "設定済み" : "未設定"}</span></dd></div></dl></section><section className="alert error"><strong>秘密情報について</strong><br />クライアントシークレットとトークンは、チャットやGitHubへ貼らないでください。</section></aside></div></div></main>;
}
