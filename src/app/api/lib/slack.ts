/**
 * Slack App OAuth + signing secret verification.
 *
 * Handles the OAuth v2 flow, token exchange, revocation,
 * event signature verification, and authenticated API calls.
 *
 * Slack bot tokens do NOT expire — no refresh flow needed.
 */

import { encryptToken, decryptToken } from "./gmail"

// ─── Config ──────────────────────────────────────────────────

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID ?? ""
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET ?? ""
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET ?? ""
const SLACK_REDIRECT_URI =
  process.env.SLACK_REDIRECT_URI ?? "http://localhost:3000/api/slack/callback"
const SLACK_API = "https://slack.com/api"

const BOT_SCOPES = [
  "channels:read",
  "channels:history",
  "channels:join",
  "groups:read",
  "groups:history",
  "chat:write",
  "users:read",
  "users:read.email",
  "im:read",
  "im:history",
  "mpim:read",
  "mpim:history",
  "reactions:read",
  "reactions:write",
  "files:read",
  "files:write",
  "app_mentions:read",
].join(",")

// Optional user scope for search
const USER_SCOPES = "search:read"

// ─── Configuration Check ─────────────────────────────────────

export function isSlackConfigured(): boolean {
  return Boolean(SLACK_CLIENT_ID && SLACK_CLIENT_SECRET)
}

// ─── OAuth URL Builder ───────────────────────────────────────

export function buildSlackOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    scope: BOT_SCOPES,
    user_scope: USER_SCOPES,
    redirect_uri: SLACK_REDIRECT_URI,
    state,
  })
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`
}

// ─── Token Exchange ──────────────────────────────────────────

export interface SlackOAuthResponse {
  ok: boolean
  access_token: string
  token_type: string
  scope: string
  bot_user_id: string
  team: { id: string; name: string }
  authed_user: {
    id: string
    scope?: string
    access_token?: string
  }
  error?: string
}

export async function exchangeSlackCode(
  code: string
): Promise<SlackOAuthResponse> {
  const res = await fetch(`${SLACK_API}/oauth.v2.access`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: SLACK_CLIENT_ID,
      client_secret: SLACK_CLIENT_SECRET,
      code,
      redirect_uri: SLACK_REDIRECT_URI,
    }),
  })

  const data = await res.json()
  if (!data.ok) {
    throw new Error(`Slack OAuth failed: ${data.error}`)
  }
  return data
}

/**
 * Revoke a Slack token.
 */
export async function revokeSlackToken(token: string): Promise<void> {
  await fetch(`${SLACK_API}/auth.revoke`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })
}

// ─── Slack API Helper ────────────────────────────────────────

export async function slackFetch(
  token: string,
  method: string,
  params?: Record<string, string>,
  body?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  let url = `${SLACK_API}/${method}`
  if (params) {
    url += `?${new URLSearchParams(params).toString()}`
  }

  const options: RequestInit = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
  }

  if (body) {
    options.method = "POST"
    options.body = JSON.stringify(body)
  }

  const res = await fetch(url, options)
  const data = await res.json()

  if (!data.ok) {
    throw new Error(`Slack API ${method}: ${data.error}`)
  }

  return data
}

// ─── Event Signature Verification ────────────────────────────

/**
 * Verify that an incoming request is from Slack using HMAC-SHA256.
 *
 * Slack sends:
 * - X-Slack-Signature: v0={hash}
 * - X-Slack-Request-Timestamp: {unix_ts}
 */
export async function verifySlackSignature(
  body: string,
  signature: string | null,
  timestamp: string | null
): Promise<boolean> {
  if (!signature || !timestamp || !SLACK_SIGNING_SECRET) return false

  // Reject requests older than 5 minutes to prevent replay attacks
  const now = Math.floor(Date.now() / 1000)
  const ts = parseInt(timestamp, 10)
  if (Math.abs(now - ts) > 300) return false

  const sigBasestring = `v0:${timestamp}:${body}`

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SLACK_SIGNING_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(sigBasestring)
  )

  const expected = `v0=${Buffer.from(sig).toString("hex")}`

  // Constant-time comparison
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return diff === 0
}

// Re-export encryption for Slack use
export { encryptToken, decryptToken }
