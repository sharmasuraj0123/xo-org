/**
 * GitHub App token manager.
 *
 * Handles JWT generation (app-level auth) and installation access tokens
 * (repo-level auth). Installation tokens expire after 1 hour; this module
 * caches them and auto-refreshes before expiry.
 *
 * Requires: GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY (base64-encoded PEM)
 */

import type { GitHubInstallationToken } from "./types"

// ─── Config ──────────────────────────────────────────────────

const GITHUB_APP_ID = process.env.GITHUB_APP_ID ?? ""
const GITHUB_APP_PRIVATE_KEY_B64 = process.env.GITHUB_APP_PRIVATE_KEY ?? ""
const GITHUB_API = "https://api.github.com"

// Decode PEM from base64 env var (stored base64 to avoid newline issues)
function getPrivateKey(): string {
  if (!GITHUB_APP_PRIVATE_KEY_B64) {
    throw new Error("GITHUB_APP_PRIVATE_KEY is not configured")
  }
  return Buffer.from(GITHUB_APP_PRIVATE_KEY_B64, "base64").toString("utf-8")
}

// ─── JWT Generation ──────────────────────────────────────────
// GitHub Apps authenticate by signing a JWT with the app's private key.
// JWTs are valid for up to 10 minutes.

async function createAppJWT(): Promise<string> {
  if (!GITHUB_APP_ID) throw new Error("GITHUB_APP_ID is not configured")

  const privateKeyPem = getPrivateKey()

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "RS256", typ: "JWT" }
  const payload = {
    iat: now - 60, // issued 60s ago to account for clock drift
    exp: now + 600, // expires in 10 minutes
    iss: GITHUB_APP_ID,
  }

  const enc = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url")

  const unsigned = `${enc(header)}.${enc(payload)}`

  // Import the RSA private key and sign
  const keyData = pemToArrayBuffer(privateKeyPem)
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsigned)
  )

  const sig = Buffer.from(signature).toString("base64url")
  return `${unsigned}.${sig}`
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN .*-----/g, "")
    .replace(/-----END .*-----/g, "")
    .replace(/\s/g, "")
  const binary = atob(b64)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    buf[i] = binary.charCodeAt(i)
  }
  return buf.buffer
}

// ─── Installation Token Cache ────────────────────────────────

const tokenCache = new Map<number, GitHubInstallationToken>()

// Refresh 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000

function getCachedToken(installationId: number): GitHubInstallationToken | null {
  const cached = tokenCache.get(installationId)
  if (!cached) return null
  if (Date.now() > cached.expiresAt - REFRESH_BUFFER_MS) return null
  return cached
}

/**
 * Get a valid installation access token. Returns from cache if still valid,
 * otherwise requests a new one from GitHub.
 */
export async function getInstallationToken(
  installationId: number
): Promise<GitHubInstallationToken> {
  const cached = getCachedToken(installationId)
  if (cached) return cached

  const jwt = await createAppJWT()

  const res = await fetch(
    `${GITHUB_API}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  )

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to get installation token (${res.status}): ${body}`)
  }

  const data = await res.json()

  const token: GitHubInstallationToken = {
    token: data.token,
    expiresAt: new Date(data.expires_at).getTime(),
    installationId,
  }

  tokenCache.set(installationId, token)
  return token
}

/**
 * Invalidate a cached installation token (e.g., when app is uninstalled).
 */
export function invalidateToken(installationId: number): void {
  tokenCache.delete(installationId)
}

// ─── GitHub API Helper ───────────────────────────────────────

/**
 * Make an authenticated GitHub API request using an installation token.
 */
export async function githubFetch(
  installationId: number,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { token } = await getInstallationToken(installationId)

  return fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
}

// ─── Webhook Signature Verification ──────────────────────────

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? ""

/**
 * Verify that a webhook payload was sent by GitHub using HMAC-SHA256.
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string | null
): Promise<boolean> {
  if (!signature || !WEBHOOK_SECRET) return false

  const sigHex = signature.replace("sha256=", "")

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WEBHOOK_SECRET),
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

  // Constant-time comparison
  if (expected.length !== sigHex.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sigHex.charCodeAt(i)
  }
  return diff === 0
}

// ─── Utility: Check Configuration ────────────────────────────

export function isGitHubConfigured(): boolean {
  return Boolean(GITHUB_APP_ID && GITHUB_APP_PRIVATE_KEY_B64)
}

export function getGitHubAppId(): string {
  return GITHUB_APP_ID
}

export function getGitHubClientId(): string {
  return process.env.GITHUB_CLIENT_ID ?? ""
}
