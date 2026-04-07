/**
 * Stripe Connect OAuth + API helpers.
 *
 * Standard Connect OAuth tokens do NOT expire. We use the
 * stripe_user_id with the Stripe-Account header and our own
 * platform secret key for all API calls.
 */

import { encryptToken, decryptToken } from "./gmail"

// ─── Config ──────────────────────────────────────────────────

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? ""
const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID ?? ""
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ""
const STRIPE_REDIRECT_URI =
  process.env.STRIPE_REDIRECT_URI ?? "http://localhost:3000/api/stripe/callback"
const STRIPE_API = "https://api.stripe.com/v1"

// ─── Configuration Check ─────────────────────────────────────

export function isStripeConfigured(): boolean {
  return Boolean(STRIPE_SECRET_KEY && STRIPE_CLIENT_ID)
}

// ─── OAuth URL Builder ───────────────────────────────────────

export function buildStripeOAuthUrl(state: string, scope: "read_write" | "read_only" = "read_write"): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: STRIPE_CLIENT_ID,
    scope,
    redirect_uri: STRIPE_REDIRECT_URI,
    state,
  })
  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`
}

// ─── Token Exchange ──────────────────────────────────────────

export interface StripeOAuthResponse {
  access_token: string
  refresh_token: string
  stripe_user_id: string
  stripe_publishable_key: string
  scope: string
  livemode: boolean
}

export async function exchangeStripeCode(code: string): Promise<StripeOAuthResponse> {
  const res = await fetch("https://connect.stripe.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_secret: STRIPE_SECRET_KEY,
    }),
  })

  const data = await res.json()
  if (data.error) {
    throw new Error(`Stripe OAuth failed: ${data.error_description ?? data.error}`)
  }
  return data
}

/**
 * Deauthorize a connected account.
 */
export async function deauthorizeStripeAccount(stripeUserId: string): Promise<void> {
  await fetch("https://connect.stripe.com/oauth/deauthorize", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: STRIPE_CLIENT_ID,
      stripe_user_id: stripeUserId,
    }),
  })
}

// ─── Stripe API Helper ──────────────────────────────────────

/**
 * Make an authenticated Stripe API request on behalf of a connected account.
 * Uses the platform's secret key + Stripe-Account header.
 */
export async function stripeFetch(
  stripeUserId: string,
  path: string,
  options: {
    method?: string
    params?: Record<string, string>
    body?: Record<string, string>
  } = {}
): Promise<Record<string, unknown>> {
  let url = `${STRIPE_API}${path}`
  if (options.params) {
    url += `?${new URLSearchParams(options.params).toString()}`
  }

  const fetchOpts: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Stripe-Account": stripeUserId,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }

  if (options.body) {
    fetchOpts.body = new URLSearchParams(options.body).toString()
  }

  const res = await fetch(url, fetchOpts)
  const data = await res.json()

  if (data.error) {
    throw new Error(`Stripe API: ${data.error.message ?? data.error.type}`)
  }

  return data
}

// ─── Webhook Signature Verification ──────────────────────────

export async function verifyStripeWebhook(
  payload: string,
  signature: string | null
): Promise<boolean> {
  if (!signature || !STRIPE_WEBHOOK_SECRET) return false

  // Parse the signature header: t=timestamp,v1=signature
  const parts: Record<string, string> = {}
  for (const item of signature.split(",")) {
    const [key, value] = item.split("=")
    parts[key] = value
  }

  const timestamp = parts.t
  const sigV1 = parts.v1
  if (!timestamp || !sigV1) return false

  // Reject old timestamps (>5 min)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false

  const signedPayload = `${timestamp}.${payload}`

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(STRIPE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  )

  const expected = Buffer.from(sig).toString("hex")

  if (expected.length !== sigV1.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sigV1.charCodeAt(i)
  }
  return diff === 0
}

export { encryptToken, decryptToken }
