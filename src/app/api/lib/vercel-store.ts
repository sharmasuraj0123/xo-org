/**
 * Vercel connection persistence.
 * Tokens are long-lived — no refresh logic needed.
 */

import type { VercelConnection, VercelConnectionStatus } from "./types"
import { encryptToken, decryptToken } from "./vercel"

const connections = new Map<string, VercelConnection>()

export async function saveConnection(
  accessToken: string,
  teamId: string | null,
  installationId: string,
  configurationId: string | null,
  username: string,
  email: string
): Promise<VercelConnection> {
  const now = Date.now()
  const connection: VercelConnection = {
    encryptedAccessToken: await encryptToken(accessToken),
    teamId,
    installationId,
    configurationId,
    username,
    email,
    status: "connected",
    connectedAt: now,
    updatedAt: now,
  }
  connections.set(installationId, connection)
  return connection
}

export function getActiveConnection(): VercelConnection | undefined {
  for (const conn of connections.values()) {
    if (conn.status === "connected") return conn
  }
  return undefined
}

export function updateConnectionStatus(
  installationId: string,
  status: VercelConnectionStatus
): VercelConnection | undefined {
  const conn = connections.get(installationId)
  if (!conn) return undefined
  conn.status = status
  conn.updatedAt = Date.now()
  return conn
}

export function removeConnection(installationId: string): boolean {
  return connections.delete(installationId)
}

export async function getAccessToken(): Promise<{
  token: string
  teamId: string | null
} | null> {
  const conn = getActiveConnection()
  if (!conn) return null
  const token = await decryptToken(conn.encryptedAccessToken)
  return { token, teamId: conn.teamId }
}
