/**
 * Vercel Integration OAuth + API helpers.
 *
 * Vercel access tokens obtained through the Integration flow are
 * long-lived and do NOT expire. No refresh flow needed.
 *
 * If the connection is to a team, ?teamId={teamId} must be appended
 * to every API request.
 */

import { encryptToken, decryptToken } from "./gmail"

// ─── Config ──────────────────────────────────────────────────

const VERCEL_CLIENT_ID = process.env.VERCEL_CLIENT_ID ?? ""
const VERCEL_CLIENT_SECRET = process.env.VERCEL_CLIENT_SECRET ?? ""
const VERCEL_INTEGRATION_SLUG = process.env.VERCEL_INTEGRATION_SLUG ?? "xo-org"
const VERCEL_REDIRECT_URI =
  process.env.VERCEL_REDIRECT_URI ?? "http://localhost:3000/api/vercel/callback"
const VERCEL_API = "https://api.vercel.com"

// ─── Configuration Check ─────────────────────────────────────

export function isVercelConfigured(): boolean {
  return Boolean(VERCEL_CLIENT_ID && VERCEL_CLIENT_SECRET)
}

// ─── OAuth URL Builder ───────────────────────────────────────

export function buildVercelOAuthUrl(state: string): string {
  return `https://vercel.com/integrations/${VERCEL_INTEGRATION_SLUG}/new?state=${encodeURIComponent(state)}`
}

// ─── Token Exchange ──────────────────────────────────────────

export interface VercelOAuthResponse {
  access_token: string
  token_type: string
  installation_id: string
  user_id: string
  team_id: string | null
  configuration_id?: string
}

export async function exchangeVercelCode(code: string): Promise<VercelOAuthResponse> {
  const res = await fetch(`${VERCEL_API}/v2/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: VERCEL_CLIENT_ID,
      client_secret: VERCEL_CLIENT_SECRET,
      code,
      redirect_uri: VERCEL_REDIRECT_URI,
    }),
  })

  const data = await res.json()
  if (data.error) {
    throw new Error(`Vercel OAuth failed: ${data.error_description ?? data.error}`)
  }
  return data
}

// ─── Vercel API Helper ───────────────────────────────────────

/**
 * Make an authenticated Vercel API request.
 * Automatically appends ?teamId= if the connection is to a team.
 */
export async function vercelFetch(
  accessToken: string,
  teamId: string | null,
  path: string,
  options: {
    method?: string
    params?: Record<string, string>
    body?: unknown
  } = {}
): Promise<Record<string, unknown>> {
  const url = new URL(`${VERCEL_API}${path}`)

  if (teamId) url.searchParams.set("teamId", teamId)
  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url.searchParams.set(k, v)
    }
  }

  const fetchOpts: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  }

  if (options.body) {
    fetchOpts.body = JSON.stringify(options.body)
  }

  const res = await fetch(url.toString(), fetchOpts)
  const data = await res.json()

  if (data.error) {
    const errMsg = typeof data.error === "string"
      ? data.error
      : data.error.message ?? data.error.code ?? "Unknown error"
    throw new Error(`Vercel API: ${errMsg}`)
  }

  return data
}

/**
 * Fetch the authenticated user's profile.
 */
export async function fetchVercelUser(
  accessToken: string
): Promise<{ username: string; email: string }> {
  const data = await vercelFetch(accessToken, null, "/v2/user")
  const user = data.user as Record<string, unknown>
  return {
    username: (user.username as string) ?? "",
    email: (user.email as string) ?? "",
  }
}

// ─── Webhook Signature Verification ──────────────────────────

export async function verifyVercelWebhook(
  payload: string,
  signature: string | null
): Promise<boolean> {
  if (!signature || !VERCEL_CLIENT_SECRET) return false

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(VERCEL_CLIENT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  )

  const expected = Buffer.from(sig).toString("hex")

  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return diff === 0
}

export { encryptToken, decryptToken }
