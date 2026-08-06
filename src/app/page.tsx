"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const body = mode === "login"
      ? { email: form.get("email"), password: form.get("password") }
      : {
          email: form.get("email"), password: form.get("password"), name: form.get("name"),
          bank: { bankName: form.get("bankName"), branchName: form.get("branchName"),
            accountType: form.get("accountType"), accountNumber: form.get("accountNumber"),
            accountHolder: form.get("accountHolder") },
        };
    const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) return setError(data.error || "処理に失敗しました");
    router.push("/dashboard");
  }

  return (
    <main className="auth-shell">
      <section className="auth-story">
        <div className="brand brand-light"><span className="brand-mark">DS</span><span>Deep session</span></div>
        <div className="story-copy">
          <p className="eyebrow">STAFF PAYMENT PORTAL</p>
          <h1>出勤から請求まで、<br />迷わずひとつに。</h1>
          <p>イベントごとの報酬と交通経路を入力するだけ。請求書の作成と提出を、シンプルに完了できます。</p>
        </div>
        <div className="story-note"><span>✓</span> PDF請求書を自動作成・保管</div>
      </section>
      <section className="auth-panel">
        <div className="mobile-brand brand"><span className="brand-mark">DS</span><span>Deep session</span></div>
        <div className="auth-card">
          <p className="eyebrow dark">STAFF LOGIN</p>
          <h2>{mode === "login" ? "おかえりなさい" : "アカウントを作成"}</h2>
          <p className="muted">{mode === "login" ? "登録したメールアドレスでログインしてください。" : "最初に氏名と振込先を登録します。"}</p>
          <div className="segmented"><button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>ログイン</button><button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>新規登録</button></div>
          <form onSubmit={submit} className="form-stack">
            {mode === "signup" && <label>氏名<input name="name" required placeholder="山田 花子" /></label>}
            <label>メールアドレス<input name="email" type="email" required placeholder="name@example.com" /></label>
            <label>パスワード<input name="password" type="password" minLength={mode === "signup" ? 8 : 1} required placeholder={mode === "signup" ? "8文字以上" : "パスワード"} /></label>
            {mode === "signup" && <>
              <div className="form-divider"><span>振込先</span></div>
              <div className="two-cols"><label>銀行名<input name="bankName" required /></label><label>支店名<input name="branchName" required /></label></div>
              <div className="three-cols"><label>口座種別<select name="accountType"><option>普通</option><option>当座</option></select></label><label className="span-two">口座番号<input name="accountNumber" inputMode="numeric" pattern="[0-9]{5,8}" required /></label></div>
              <label>口座名義（カナ）<input name="accountHolder" required placeholder="ヤマダ ハナコ" /></label>
            </>}
            {error && <p className="alert error">{error}</p>}
            <button className="primary-button" disabled={busy}>{busy ? "処理中…" : mode === "login" ? "ログイン" : "登録してはじめる"}<span>→</span></button>
          </form>
          <a className="admin-link" href="/admin">支払い管理者はこちら</a>
        </div>
      </section>
    </main>
  );
}
