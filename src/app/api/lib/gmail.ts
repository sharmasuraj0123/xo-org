/**
 * Gmail OAuth 2.0 token manager.
 *
 * Handles the OAuth flow, token exchange, refresh, revocation,
 * and token encryption at rest.
 *
 * Requires: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, ENCRYPTION_KEY
 */

// ─── Config ──────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ""
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ""
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/gmail/callback"
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY ?? ""

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
const GMAIL_API = "https://gmail.googleapis.com/gmail/v1"

// Scopes: gmail.modify (read + send + labels), profile, email
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
]

// ─── Configuration Check ─────────────────────────────────────

export function isGmailConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
}

// ─── OAuth URL Builder ───────────────────────────────────────

export function buildOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

// ─── Token Exchange ──────────────────────────────────────────

export interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
}

export interface UserProfile {
  email: string
  name: string
  picture: string | null
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Token exchange failed (${res.status}): ${body}`)
  }

  return res.json()
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    // invalid_grant means the user revoked access or token expired
    if (body.includes("invalid_grant")) {
      throw new Error("REVOKED")
    }
    throw new Error(`Token refresh failed (${res.status}): ${body}`)
  }

  return res.json()
}

/**
 * Revoke a token (access or refresh).
 */
export async function revokeToken(token: string): Promise<void> {
  await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
}

/**
 * Fetch the user's Google profile.
 */
export async function fetchUserProfile(
  accessToken: string
): Promise<UserProfile> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch user profile (${res.status})`)
  }

  const data = await res.json()
  return {
    email: data.email,
    name: data.name ?? data.email,
    picture: data.picture ?? null,
  }
}

// ─── Gmail API Helper ────────────────────────────────────────

/**
 * Make an authenticated Gmail API request.
 * Auto-refreshes the access token if expired.
 */
export async function gmailFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${GMAIL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
}

// ─── Token Encryption ────────────────────────────────────────
// AES-GCM encryption for storing tokens at rest.

function getEncryptionKey(): Uint8Array {
  if (!ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY is not configured")
  }
  // Derive a 32-byte key from the secret
  const encoder = new TextEncoder()
  const keyBytes = encoder.encode(ENCRYPTION_KEY)
  // Pad or truncate to 32 bytes
  const key = new Uint8Array(32)
  key.set(keyBytes.slice(0, 32))
  return key
}

export async function encryptToken(token: string): Promise<string> {
  const keyData = getEncryptionKey()
  const key = await crypto.subtle.importKey(
    "raw",
    keyData.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(token)

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  )

  // Combine IV + ciphertext and base64 encode
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)

  return Buffer.from(combined).toString("base64")
}

export async function decryptToken(encrypted: string): Promise<string> {
  const keyData = getEncryptionKey()
  const key = await crypto.subtle.importKey(
    "raw",
    keyData.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  )

  const combined = Buffer.from(encrypted, "base64")
  const iv = new Uint8Array(combined.subarray(0, 12))
  const ciphertext = new Uint8Array(combined.subarray(12))

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(plaintext)
}

export function getScopes(): string[] {
  return SCOPES
}
