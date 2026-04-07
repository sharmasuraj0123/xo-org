/**
 * Rclone connection persistence.
 * Stores detected rclone binary info and available remotes.
 */

import type { RcloneConnection, RcloneConnectionStatus, RcloneRemote } from "./types"

let connection: RcloneConnection | null = null

export function saveConnection(
  rcloneVersion: string,
  configPath: string,
  remotes: RcloneRemote[]
): RcloneConnection {
  const now = Date.now()
  connection = {
    rcloneVersion,
    configPath,
    remotes,
    status: "connected",
    connectedAt: now,
    updatedAt: now,
  }
  return connection
}

export function getActiveConnection(): RcloneConnection | undefined {
  if (connection?.status === "connected") return connection
  return undefined
}

export function updateRemotes(remotes: RcloneRemote[]): RcloneConnection | undefined {
  if (!connection) return undefined
  connection.remotes = remotes
  connection.updatedAt = Date.now()
  return connection
}

export function updateConnectionStatus(
  status: RcloneConnectionStatus
): RcloneConnection | undefined {
  if (!connection) return undefined
  connection.status = status
  connection.updatedAt = Date.now()
  return connection
}

export function removeConnection(): boolean {
  if (!connection) return false
  connection = null
  return true
}
