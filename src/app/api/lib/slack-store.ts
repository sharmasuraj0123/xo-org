/**
 * Slack connection persistence.
 *
 * Slack bot tokens do not expire, so no refresh logic needed.
 * Tokens are stored encrypted via AES-GCM (reuses gmail.ts encryption).
 */

import type { SlackConnection, SlackConnectionStatus } from "./types"
import { encryptToken, decryptToken } from "./slack"

// ─── In-Memory Store ─────────────────────────────────────────

const connections = new Map<string, SlackConnection>()

// ─── Operations ──────────────────────────────────────────────

export async function saveConnection(
  teamId: string,
  teamName: string,
  botUserId: string,
  authedUserId: string,
  botToken: string,
  userToken: string | null
): Promise<SlackConnection> {
  const now = Date.now()

  const connection: SlackConnection = {
    teamId,
    teamName,
    botUserId,
    authedUserId,
    encryptedBotToken: await encryptToken(botToken),
    encryptedUserToken: userToken ? await encryptToken(userToken) : null,
    status: "connected",
    connectedAt: now,
    updatedAt: now,
  }

  connections.set(teamId, connection)
  return connection
}

export function getConnection(teamId: string): SlackConnection | undefined {
  return connections.get(teamId)
}

export function getActiveConnection(): SlackConnection | undefined {
  for (const conn of connections.values()) {
    if (conn.status === "connected") return conn
  }
  return undefined
}

export function listConnections(): SlackConnection[] {
  return Array.from(connections.values())
}

export function updateConnectionStatus(
  teamId: string,
  status: SlackConnectionStatus
): SlackConnection | undefined {
  const conn = connections.get(teamId)
  if (!conn) return undefined
  conn.status = status
  conn.updatedAt = Date.now()
  return conn
}

export function removeConnection(teamId: string): boolean {
  return connections.delete(teamId)
}

/**
 * Get the decrypted bot token for the active connection.
 */
export async function getBotToken(): Promise<{
  token: string
  teamId: string
  botUserId: string
} | null> {
  const conn = getActiveConnection()
  if (!conn) return null

  const token = await decryptToken(conn.encryptedBotToken)
  return { token, teamId: conn.teamId, botUserId: conn.botUserId }
}

/**
 * Get the decrypted user token (for search).
 */
export async function getUserToken(): Promise<string | null> {
  const conn = getActiveConnection()
  if (!conn?.encryptedUserToken) return null
  return decryptToken(conn.encryptedUserToken)
}
