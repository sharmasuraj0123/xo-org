/**
 * Gmail connection persistence.
 *
 * Stores OAuth connection data in-memory (mirrors bridge.ts pattern).
 * Tokens are stored encrypted via gmail.ts encrypt/decrypt functions.
 */

import type { GmailConnection, GmailConnectionStatus } from "./types"
import {
  refreshAccessToken,
  encryptToken,
  decryptToken,
} from "./gmail"

// ─── In-Memory Store ─────────────────────────────────────────

const connections = new Map<string, GmailConnection>()

// ─── Operations ──────────────────────────────────────────────

export async function saveConnection(
  email: string,
  displayName: string,
  avatarUrl: string | null,
  refreshToken: string,
  accessToken: string,
  expiresIn: number,
  scopes: string[]
): Promise<GmailConnection> {
  const now = Date.now()

  const connection: GmailConnection = {
    email,
    displayName,
    avatarUrl,
    encryptedRefreshToken: await encryptToken(refreshToken),
    encryptedAccessToken: await encryptToken(accessToken),
    tokenExpiry: now + expiresIn * 1000,
    scopes,
    status: "connected",
    connectedAt: now,
    updatedAt: now,
  }

  connections.set(email, connection)
  return connection
}

export function getConnection(email: string): GmailConnection | undefined {
  return connections.get(email)
}

/**
 * Get the first active Gmail connection (org-wide model).
 */
export function getActiveConnection(): GmailConnection | undefined {
  for (const conn of connections.values()) {
    if (conn.status === "connected") return conn
  }
  return undefined
}

export function listConnections(): GmailConnection[] {
  return Array.from(connections.values())
}

export function updateConnectionStatus(
  email: string,
  status: GmailConnectionStatus
): GmailConnection | undefined {
  const conn = connections.get(email)
  if (!conn) return undefined

  conn.status = status
  conn.updatedAt = Date.now()
  return conn
}

export function removeConnection(email: string): boolean {
  return connections.delete(email)
}

/**
 * Get a valid access token for the active connection.
 * Refreshes automatically if expired.
 */
export async function getValidAccessToken(): Promise<{
  token: string
  email: string
} | null> {
  const conn = getActiveConnection()
  if (!conn) return null

  const now = Date.now()
  const BUFFER_MS = 5 * 60 * 1000 // Refresh 5 min before expiry

  // Return cached token if still valid
  if (conn.encryptedAccessToken && conn.tokenExpiry > now + BUFFER_MS) {
    const token = await decryptToken(conn.encryptedAccessToken)
    return { token, email: conn.email }
  }

  // Refresh the token
  try {
    const refreshToken = await decryptToken(conn.encryptedRefreshToken)
    const result = await refreshAccessToken(refreshToken)

    conn.encryptedAccessToken = await encryptToken(result.access_token)
    conn.tokenExpiry = now + result.expires_in * 1000
    conn.updatedAt = now

    return { token: result.access_token, email: conn.email }
  } catch (err) {
    if (err instanceof Error && err.message === "REVOKED") {
      conn.status = "expired"
      conn.updatedAt = now
      return null
    }
    throw err
  }
}
