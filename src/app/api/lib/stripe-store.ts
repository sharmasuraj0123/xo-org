/**
 * Stripe connection persistence.
 *
 * Standard Connect OAuth tokens do not expire.
 * We primarily use stripe_user_id + platform secret key.
 */

import type { StripeConnection, StripeConnectionStatus } from "./types"
import { encryptToken } from "./stripe"

// ─── In-Memory Store ─────────────────────────────────────────

const connections = new Map<string, StripeConnection>()

// ─── Operations ──────────────────────────────────────────────

export async function saveConnection(
  stripeUserId: string,
  businessName: string,
  email: string,
  accessToken: string,
  refreshToken: string | null,
  scope: "read_write" | "read_only",
  livemode: boolean
): Promise<StripeConnection> {
  const now = Date.now()

  const connection: StripeConnection = {
    stripeUserId,
    businessName,
    email,
    encryptedAccessToken: await encryptToken(accessToken),
    encryptedRefreshToken: refreshToken ? await encryptToken(refreshToken) : null,
    scope,
    livemode,
    status: "connected",
    connectedAt: now,
    updatedAt: now,
  }

  connections.set(stripeUserId, connection)
  return connection
}

export function getConnection(stripeUserId: string): StripeConnection | undefined {
  return connections.get(stripeUserId)
}

export function getActiveConnection(): StripeConnection | undefined {
  for (const conn of connections.values()) {
    if (conn.status === "connected") return conn
  }
  return undefined
}

export function listConnections(): StripeConnection[] {
  return Array.from(connections.values())
}

export function updateConnectionStatus(
  stripeUserId: string,
  status: StripeConnectionStatus
): StripeConnection | undefined {
  const conn = connections.get(stripeUserId)
  if (!conn) return undefined
  conn.status = status
  conn.updatedAt = Date.now()
  return conn
}

export function removeConnection(stripeUserId: string): boolean {
  return connections.delete(stripeUserId)
}

/**
 * Get the stripe_user_id for the active connection.
 * This is used with the Stripe-Account header.
 */
export function getStripeAccountId(): string | null {
  const conn = getActiveConnection()
  return conn?.stripeUserId ?? null
}
