"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClaimWithItems } from "@/lib/types";

const yen = (value: number) => `¥${value.toLocaleString("ja-JP")}`;

export default function AdminClaimDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [claim, setClaim] = useState<ClaimWithItems | null>(null);
  const [message, setMessage] = useState("");
  async function load() { const response = await fetch("/api/admin/claims"); if (response.status === 401) return router.push(`/admin?returnTo=${encodeURIComponent(`/admin/claims/${id}`)}`); const claims = (await response.json()).claims as ClaimWithItems[]; setClaim(claims.find((candidate) => candidate.id === id) || null); }
  useEffect(() => {
    let active = true;
    fetch("/api/admin/claims").then(async (response) => {
      if (!active) return;
      if (response.status === 401) {
        router.push(`/admin?returnTo=${encodeURIComponent(`/admin/claims/${id}`)}`);
        return;
      }
      const claims = (await response.json()).claims as ClaimWithItems[];
      if (active) setClaim(claims.find((candidate) => candidate.id === id) || null);
    });
    return () => { active = false; };
  }, [id, router]);
  async function action(kind: "pay" | "resend") { setMessage("処理中…"); const response = await fetch(`/api/admin/claims/${id}/${kind}`, { method: "POST" }); const data = await response.json(); setMessage(response.ok ? kind === "pay" ? "支払済みに更新しました" : "メールを再送しました" : data.error); if (response.ok) await load(); }
  if (!claim) return <div className="center-loader">請求を読み込み中…</div>;
  return <main className="detail-shell"><header className="admin-header"><div className="brand"><span className="brand-mark">DS</span><span>Payment Admin</span></div><button className="ghost-button" onClick={() => router.push("/admin")}>← 一覧へ戻る</button></header><div className="detail-main"><div className="detail-heading"><div><p className="eyebrow dark">CLAIM DETAIL</p><h1>{claim.claimantName}</h1><p className="muted">{claim.invoiceNumber} / {claim.targetMonth}</p></div><span className={`status large ${claim.status}`}>{claim.status === "paid" ? "支払済み" : claim.status === "pending" ? "支払待ち" : "要確認"}</span></div><div className="detail-grid"><section className="form-card detail-items"><h2>請求明細</h2>{claim.items.map((item, i) => <div className="detail-item" key={item.id}><span>{String(i + 1).padStart(2, "0")}</span><div><strong>{new Date(`${item.eventDate}T00:00:00`).toLocaleDateString("ja-JP")}　{item.location}</strong><small>{item.departureStation} → {item.arrivalStation}</small></div><div><strong>{yen(item.rewardAmount)}</strong><small>交通費 {yen(item.transportAmount)}</small></div></div>)}<div className="total-box"><p><span>報酬合計</span><strong>{yen(claim.rewardTotal)}</strong></p><p><span>交通費合計</span><strong>{yen(claim.transportTotal)}</strong></p><p className="grand"><span>振込金額</span><strong>{yen(claim.grandTotal)}</strong></p></div></section><aside><section className="form-card"><h2>振込先</h2><dl className="info-list"><div><dt>銀行</dt><dd>{claim.bank.bankName}</dd></div><div><dt>支店</dt><dd>{claim.bank.branchName}</dd></div><div><dt>口座</dt><dd>{claim.bank.accountType} {claim.bank.accountNumber}</dd></div><div><dt>名義</dt><dd>{claim.bank.accountHolder}</dd></div></dl></section><section className="form-card action-card"><a className="secondary-button full" target="_blank" href={`/api/claims/${claim.id}/pdf`}>PDFを表示 ↗</a>{claim.driveFileUrl && <a className="secondary-button full" target="_blank" href={claim.driveFileUrl}>Google Drive ↗</a>}<button className="secondary-button full" onClick={() => action("resend")}>メールを再送</button>{claim.status !== "paid" && <button className="primary-button" onClick={() => action("pay")}>支払済みにする <span>✓</span></button>}{message && <p className="alert success">{message}</p>}</section>{claim.errorMessage && <section className="alert error"><strong>連携エラー</strong><br />{claim.errorMessage}</section>}</aside></div></div></main>;
}
