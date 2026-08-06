"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ClaimWithItems } from "@/lib/types";

const yen = (value: number) => `¥${value.toLocaleString("ja-JP")}`;

export default function AdminPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<ClaimWithItems[] | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "error">("pending");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch("/api/admin/claims");
    if (response.status === 401) { setNeedsLogin(true); setClaims([]); return; }
    setClaims((await response.json()).claims || []); setNeedsLogin(false);
  }
  useEffect(() => {
    let active = true;
    fetch("/api/admin/claims").then(async (response) => {
      if (!active) return;
      if (response.status === 401) { setNeedsLogin(true); setClaims([]); return; }
      setClaims((await response.json()).claims || []);
      setNeedsLogin(false);
    });
    return () => { active = false; };
  }, []);
  const visible = useMemo(() => (claims || []).filter((claim) => {
    const statusMatch = filter === "all" || (filter === "error" ? claim.status.includes("error") : claim.status === filter);
    return statusMatch && `${claim.claimantName}${claim.invoiceNumber}${claim.targetMonth}`.toLowerCase().includes(query.toLowerCase());
  }), [claims, filter, query]);
  const pendingTotal = (claims || []).filter((c) => c.status !== "paid").reduce((s, c) => s + c.grandTotal, 0);

  async function login(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setMessage(""); const password = new FormData(event.currentTarget).get("password"); const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); const data = await response.json(); if (!response.ok) return setMessage(data.error); const returnTo = new URLSearchParams(location.search).get("returnTo"); if (returnTo?.startsWith("/admin/claims/")) return router.push(returnTo); await load(); }
  async function pay(id: string) { if (!confirm("この請求を支払済みにしますか？")) return; const response = await fetch(`/api/admin/claims/${id}/pay`, { method: "POST" }); if (response.ok) await load(); }

  if (claims === null) return <div className="center-loader">読み込み中…</div>;
  if (needsLogin) return <main className="admin-login"><div className="admin-login-card"><div className="brand"><span className="brand-mark">DS</span><span>Deep session</span></div><p className="eyebrow dark">PAYMENT ADMIN</p><h1>支払い管理</h1><p className="muted">管理者用の共通パスワードを入力してください。</p><form onSubmit={login} className="form-stack"><label>管理者パスワード<input name="password" type="password" autoFocus required /></label>{message && <p className="alert error">{message}</p>}<button className="primary-button">管理画面を開く <span>→</span></button></form><Link className="admin-link" href="/">スタッフ画面へ戻る</Link></div></main>;

  return <main className="admin-shell"><header className="admin-header"><div className="brand"><span className="brand-mark">DS</span><span>Payment Admin</span></div><div><Link href="/admin/google" className="secondary-button">Google連携</Link><a href={process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL || "#"} target="_blank" className="secondary-button">スプレッドシート ↗</a><button className="ghost-button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); location.reload(); }}>ログアウト</button></div></header><div className="admin-main"><div className="page-heading"><div><p className="eyebrow dark">PAYMENT OVERVIEW</p><h1>支払い管理</h1><p className="muted">提出された請求を確認し、支払状況を更新します。</p></div></div><div className="summary-grid admin-summary"><div className="summary-card accent"><span>未対応金額</span><strong>{yen(pendingTotal)}</strong><small>{(claims || []).filter((c) => c.status !== "paid").length}件</small></div><div className="summary-card"><span>今月の請求</span><strong>{(claims || []).filter((c) => c.targetMonth === new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }).slice(0, 7)).length}<em>件</em></strong></div><div className="summary-card"><span>支払済み</span><strong>{(claims || []).filter((c) => c.status === "paid").length}<em>件</em></strong></div></div><div className="table-card"><div className="admin-toolbar"><div className="filter-tabs">{([['pending','未対応'],['paid','支払済み'],['error','エラー'],['all','すべて']] as const).map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div><input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="名前・請求番号で検索" /></div><div className="table-scroll"><table><thead><tr><th>請求者</th><th>対象・形式</th><th>報酬</th><th>交通費</th><th>振込金額</th><th>状況</th><th>操作</th></tr></thead><tbody>{visible.map((claim) => <tr key={claim.id}><td><strong>{claim.claimantName}</strong><small className="cell-sub">{claim.invoiceNumber}</small></td><td>{claim.targetMonth}<small className="cell-sub">{claim.type === "single" ? "単発" : `月まとめ・${claim.items.length}件`}</small></td><td>{yen(claim.rewardTotal)}</td><td>{yen(claim.transportTotal)}</td><td><strong>{yen(claim.grandTotal)}</strong></td><td><span className={`status ${claim.status}`}>{claim.status === "paid" ? "支払済み" : claim.status === "pending" ? "支払待ち" : "要確認"}</span></td><td><div className="action-row"><button className="text-link button-link" onClick={() => router.push(`/admin/claims/${claim.id}`)}>詳細</button>{claim.status !== "paid" && <button className="pay-button" onClick={() => pay(claim.id)}>支払済みにする</button>}</div></td></tr>)}</tbody></table>{visible.length === 0 && <div className="empty compact-empty"><h3>該当する請求はありません</h3></div>}</div></div></div></main>;
}
