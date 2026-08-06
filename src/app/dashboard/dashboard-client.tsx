"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BankAccount, ClaimWithItems } from "@/lib/types";

type Profile = { id: string; email: string; name: string; bank: BankAccount };
type Tab = "claims" | "new" | "settings";
type DraftItem = { eventDate: string; location: string; rewardAmount: number; departureStation: string; arrivalStation: string; transportAmount: number };
const blankItem = (): DraftItem => ({ eventDate: "", location: "", rewardAmount: 0, departureStation: "", arrivalStation: "", transportAmount: 0 });
const yen = (value: number) => `¥${value.toLocaleString("ja-JP")}`;

export default function DashboardClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [claims, setClaims] = useState<ClaimWithItems[]>([]);
  const [tab, setTab] = useState<Tab>("claims");
  const [loading, setLoading] = useState(true);

  async function load() {
    const [profileResponse, claimsResponse] = await Promise.all([fetch("/api/profile"), fetch("/api/claims")]);
    if (profileResponse.status === 401) return router.push("/");
    setProfile((await profileResponse.json()).user);
    setClaims((await claimsResponse.json()).claims || []);
    setLoading(false);
  }
  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/profile"), fetch("/api/claims")]).then(async ([profileResponse, claimsResponse]) => {
      if (!active) return;
      if (profileResponse.status === 401) return router.push("/");
      const [profileData, claimsData] = await Promise.all([profileResponse.json(), claimsResponse.json()]);
      if (!active) return;
      setProfile(profileData.user);
      setClaims(claimsData.claims || []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [router]);

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); }
  if (loading || !profile) return <div className="center-loader">読み込み中…</div>;

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">DS</span><span>Deep session</span></div>
      <nav>
        <button className={tab === "claims" ? "active" : ""} onClick={() => setTab("claims")}><span>▤</span>請求履歴</button>
        <button className={tab === "new" ? "active" : ""} onClick={() => setTab("new")}><span>＋</span>請求を作成</button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}><span>⚙</span>アカウント設定</button>
      </nav>
      <div className="sidebar-user"><div className="avatar">{profile.name.slice(0, 1)}</div><div><strong>{profile.name}</strong><small>{profile.email}</small></div><button onClick={logout} title="ログアウト">↗</button></div>
    </aside>
    <section className="main-content">
      <header className="mobile-header"><div className="brand"><span className="brand-mark">DS</span><span>Deep session</span></div><button onClick={logout}>ログアウト</button></header>
      <div className="mobile-tabs"><button onClick={() => setTab("claims")}>履歴</button><button onClick={() => setTab("new")}>＋ 請求</button><button onClick={() => setTab("settings")}>設定</button></div>
      {tab === "claims" && <ClaimsView claims={claims} onCreate={() => setTab("new")} />}
      {tab === "new" && <ClaimForm profile={profile} onCreated={async () => { await load(); setTab("claims"); }} />}
      {tab === "settings" && <Settings profile={profile} onSaved={load} />}
    </section>
  </main>;
}

function ClaimsView({ claims, onCreate }: { claims: ClaimWithItems[]; onCreate: () => void }) {
  const unpaid = claims.filter((claim) => claim.status !== "paid").reduce((sum, claim) => sum + claim.grandTotal, 0);
  return <div className="page-wrap">
    <div className="page-heading"><div><p className="eyebrow dark">MY CLAIMS</p><h1>請求履歴</h1><p className="muted">提出した請求と支払状況を確認できます。</p></div><button className="primary-button compact" onClick={onCreate}>＋ 新しい請求</button></div>
    <div className="summary-grid"><div className="summary-card accent"><span>未支払金額</span><strong>{yen(unpaid)}</strong><small>{claims.filter((c) => c.status !== "paid").length}件の請求</small></div><div className="summary-card"><span>提出済み</span><strong>{claims.length}<em>件</em></strong><small>すべての請求</small></div><div className="summary-card"><span>支払済み</span><strong>{claims.filter((c) => c.status === "paid").length}<em>件</em></strong><small>対応完了</small></div></div>
    <div className="table-card"><div className="table-title"><h2>請求一覧</h2></div>{claims.length === 0 ? <div className="empty"><div>⌁</div><h3>まだ請求がありません</h3><p>最初の請求を作成してみましょう。</p><button className="secondary-button" onClick={onCreate}>請求を作成</button></div> : <div className="table-scroll"><table><thead><tr><th>請求番号</th><th>対象</th><th>形式</th><th>金額</th><th>状況</th><th>提出日</th><th></th></tr></thead><tbody>{claims.map((claim) => <tr key={claim.id}><td><strong>{claim.invoiceNumber}</strong></td><td>{claim.targetMonth}</td><td>{claim.type === "single" ? "単発" : "月まとめ"}</td><td><strong>{yen(claim.grandTotal)}</strong></td><td><Status status={claim.status} /></td><td>{new Date(claim.submittedAt).toLocaleDateString("ja-JP")}</td><td><a className="text-link" target="_blank" href={`/api/claims/${claim.id}/pdf`}>PDF ↗</a></td></tr>)}</tbody></table></div>}</div>
  </div>;
}

function Status({ status }: { status: ClaimWithItems["status"] }) {
  const labels = { pending: "支払待ち", paid: "支払済み", email_error: "メール要確認", processing_error: "処理エラー" };
  return <span className={`status ${status}`}>{labels[status]}</span>;
}

function ClaimForm({ profile, onCreated }: { profile: Profile; onCreated: () => Promise<void> }) {
  const month = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }).slice(0, 7);
  const [type, setType] = useState<"single" | "monthly">("single");
  const [targetMonth, setTargetMonth] = useState(month);
  const [items, setItems] = useState<DraftItem[]>([blankItem()]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const totals = useMemo(() => ({ reward: items.reduce((s, i) => s + Number(i.rewardAmount), 0), transport: items.reduce((s, i) => s + Number(i.transportAmount), 0) }), [items]);
  function update(index: number, key: keyof DraftItem, value: string) { setItems((current) => current.map((item, i) => i === index ? { ...item, [key]: key.endsWith("Amount") ? Number(value) : value } : item)); }
  function changeType(next: "single" | "monthly") { setType(next); if (next === "single") setItems((current) => [current[0] || blankItem()]); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/claims", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, targetMonth, items }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setMessage(data.error || "送信に失敗しました");
    if (data.claim.status === "processing_error" || data.claim.status === "email_error") setMessage(`請求は保存されましたが、外部連携でエラーが発生しました: ${data.claim.errorMessage}`);
    else await onCreated();
  }
  return <div className="page-wrap narrow"><div className="page-heading"><div><p className="eyebrow dark">NEW CLAIM</p><h1>新しい請求</h1><p className="muted">イベントごとの報酬と交通経路を入力してください。</p></div></div>
    <form onSubmit={submit} className="claim-form"><section className="form-card"><h2><span>01</span>請求形式</h2><div className="type-cards"><button type="button" className={type === "single" ? "selected" : ""} onClick={() => changeType("single")}><strong>単発請求</strong><small>1回のイベントを請求</small></button><button type="button" className={type === "monthly" ? "selected" : ""} onClick={() => changeType("monthly")}><strong>月まとめ請求</strong><small>複数イベントをまとめて請求</small></button></div><label className="short-field">対象月<input type="month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} required /></label></section>
    <section className="form-card"><div className="card-heading"><h2><span>02</span>イベント明細</h2>{type === "monthly" && <button type="button" className="secondary-button compact" onClick={() => setItems([...items, blankItem()])}>＋ イベントを追加</button>}</div>{items.map((item, index) => <div className="event-block" key={index}><div className="event-number"><span>{String(index + 1).padStart(2, "0")}</span>{items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))}>削除</button>}</div><div className="event-fields"><div className="two-cols"><label>出勤日<input type="date" value={item.eventDate} onChange={(e) => update(index, "eventDate", e.target.value)} required /></label><label>出勤場所<input value={item.location} onChange={(e) => update(index, "location", e.target.value)} placeholder="会場・店舗名" required /></label></div><label>報酬額<div className="money-input"><span>¥</span><input type="number" min="0" value={item.rewardAmount || ""} onChange={(e) => update(index, "rewardAmount", e.target.value)} required /></div></label><div className="route-grid"><label>出発駅<input value={item.departureStation} onChange={(e) => update(index, "departureStation", e.target.value)} placeholder="池袋駅" required /></label><span>→</span><label>到着駅<input value={item.arrivalStation} onChange={(e) => update(index, "arrivalStation", e.target.value)} placeholder="渋谷駅" required /></label><label>交通費<div className="money-input"><span>¥</span><input type="number" min="0" value={item.transportAmount || ""} onChange={(e) => update(index, "transportAmount", e.target.value)} required /></div></label></div></div></div>)}</section>
    <section className="form-card"><h2><span>03</span>振込先・合計</h2><div className="bank-preview"><div><small>振込先</small><strong>{profile.bank.bankName} {profile.bank.branchName}</strong><span>{profile.bank.accountType} {profile.bank.accountNumber} / {profile.bank.accountHolder}</span></div><small>変更はアカウント設定から</small></div><div className="total-box"><p><span>報酬合計</span><strong>{yen(totals.reward)}</strong></p><p><span>交通費合計</span><strong>{yen(totals.transport)}</strong></p><p className="grand"><span>ご請求金額</span><strong>{yen(totals.reward + totals.transport)}</strong></p></div></section>
    {message && <p className="alert error">{message}</p>}<button className="primary-button submit-claim" disabled={busy}>{busy ? "PDF作成・送信中…" : "内容を確認して請求を送信"}<span>→</span></button></form></div>;
}

function Settings({ profile, onSaved }: { profile: Profile; onSaved: () => Promise<void> }) {
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const body = { name: form.get("name"), bank: { bankName: form.get("bankName"), branchName: form.get("branchName"), accountType: form.get("accountType"), accountNumber: form.get("accountNumber"), accountHolder: form.get("accountHolder") } }; const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); if (!response.ok) return setMessage(data.error); setMessage("保存しました"); await onSaved(); }
  return <div className="page-wrap narrow"><div className="page-heading"><div><p className="eyebrow dark">ACCOUNT</p><h1>アカウント設定</h1><p className="muted">次回以降の請求に使う情報を管理します。</p></div></div><form className="form-card settings-form" onSubmit={submit}><h2>基本情報</h2><label>メールアドレス<input value={profile.email} disabled /></label><label>氏名<input name="name" defaultValue={profile.name} required /></label><div className="form-divider"><span>振込先</span></div><div className="two-cols"><label>銀行名<input name="bankName" defaultValue={profile.bank.bankName} required /></label><label>支店名<input name="branchName" defaultValue={profile.bank.branchName} required /></label></div><div className="two-cols"><label>口座種別<select name="accountType" defaultValue={profile.bank.accountType}><option>普通</option><option>当座</option></select></label><label>口座番号<input name="accountNumber" defaultValue={profile.bank.accountNumber} pattern="[0-9]{5,8}" required /></label></div><label>口座名義（カナ）<input name="accountHolder" defaultValue={profile.bank.accountHolder} required /></label>{message && <p className="alert success">{message}</p>}<button className="primary-button compact">変更を保存</button></form></div>;
}
