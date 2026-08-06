import { google } from "googleapis";

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/gmail.send",
];

function oauthCredentials() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_IDまたはGOOGLE_OAUTH_CLIENT_SECRETが設定されていません");
  }
  return { clientId, clientSecret };
}

export function createGoogleOAuthClient(redirectUri?: string) {
  const { clientId, clientSecret } = oauthCredentials();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleAuth() {
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("GOOGLE_OAUTH_REFRESH_TOKENが設定されていません。管理画面からGoogle連携を完了してください");
  }
  const client = createGoogleOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export function getGoogleAuthorizationUrl(redirectUri: string, state: string) {
  return createGoogleOAuthClient(redirectUri).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    login_hint: process.env.GMAIL_USER || "deepsession.soumu@gmail.com",
    scope: GOOGLE_OAUTH_SCOPES,
    state,
  });
}

export async function exchangeGoogleAuthorizationCode(redirectUri: string, code: string) {
  const client = createGoogleOAuthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("リフレッシュトークンを取得できませんでした。Google連携を解除して、もう一度お試しください");
  }
  return tokens.refresh_token;
}
