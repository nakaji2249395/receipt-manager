# Deep session 支払い請求

スタッフが単発または月まとめで支払い請求を提出し、PDF作成・Google Drive保存・管理者メール送信・支払状況管理を行うNext.jsアプリです。

## 主な機能

- スタッフのメールアドレス・パスワード登録／ログイン
- 氏名・振込先のプロフィール保存
- 単発請求（1イベント）と月まとめ請求（複数イベント）
- 同日複数イベント、同月追加請求に対応
- 各イベントの出勤日、場所、報酬額、出発駅、到着駅、交通費を保存
- 日本語PDF請求書の自動生成
- Google Driveへの年／月／請求形式別保存
- `info@hiraeth.tokyo`へのPDF添付メール
- 共通パスワード式の支払い管理画面
- Google Sheetsを本番データストアとして使用

## ローカル起動

```bash
npm install
cp .env.example .env.local
npm run dev
```

初期状態の `.env.example` は `STORAGE_MODE=local` と `SKIP_EXTERNAL_INTEGRATIONS=true` です。ローカルデータは `.data/store.json` に保存されます。

## 本番設定

Vercelでは次を変更します。

```text
STORAGE_MODE=sheets
SKIP_EXTERNAL_INTEGRATIONS=false
APP_SECRET=32文字以上のランダム値
ADMIN_PASSWORD=管理者共通パスワード
NEXT_PUBLIC_APP_URL=https://本番URL
GOOGLE_OAUTH_CLIENT_ID=Google OAuthクライアントID
GOOGLE_OAUTH_CLIENT_SECRET=Google OAuthクライアントシークレット
GOOGLE_OAUTH_REFRESH_TOKEN=管理画面のGoogle連携で取得した値
GOOGLE_OAUTH_REDIRECT_URI=https://本番URL/api/google/callback
GMAIL_USER=deepsession.soumu@gmail.com
```

Google CloudでDrive API、Sheets API、Gmail APIを有効にし、OAuthデータアクセスへ以下を追加します。

- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive`
- `https://www.googleapis.com/auth/gmail.send`

OAuthクライアント情報を設定後、管理画面の「Google連携」から `deepsession.soumu@gmail.com` を認可し、表示されたリフレッシュトークンをVercelへ登録します。サービスアカウントとGmailアプリパスワードは不要です。

本番公開前に、Driveフォルダの「リンクを知っている全員が編集可能」を削除し、所有者とサービスアカウントだけに限定してください。

## データ構成

- `Users`: アカウント、氏名、振込先、復元不可能なパスワードハッシュ
- `Claims`: 請求単位の合計、ステータス、PDFリンク、送信結果
- `Items`: イベント単位の出勤・報酬・交通経路・交通費

口座情報は請求送信時に `Claims` に複製されるため、スタッフが後から設定を変更しても過去請求は変わりません。

## セキュリティ上の注意

- 管理者パスワードはコードに含めずVercelの秘密環境変数に設定します。
- スタッフの平文パスワードは保存しません。
- 管理画面は検索エンジンのインデックス対象外です。
- Google OAuthクライアントシークレットとリフレッシュトークンをGitへコミットしないでください。
