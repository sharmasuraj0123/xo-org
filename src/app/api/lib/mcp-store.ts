/**
 * MCP connection persistence.
 * Supports multiple MCP server connections (unlike other single-connection connectors).
 */

import type { McpConnection, McpConnectionStatus, McpServerConfig, McpToolDefinition } from "./types"

const connections = new Map<string, McpConnection>()

export function saveConnection(
  config: McpServerConfig,
  serverName: string,
  serverVersion: string,
  protocolVersion: string,
  tools: McpToolDefinition[]
): McpConnection {
  const now = Date.now()
  const connection: McpConnection = {
    id: config.id,
    config,
    serverName,
    serverVersion,
    protocolVersion,
    tools,
    status: "connected",
    connectedAt: now,
    updatedAt: now,
  }
  connections.set(config.id, connection)
  return connection
}

export function getConnection(id: string): McpConnection | undefined {
  return connections.get(id)
}

export function listConnections(): McpConnection[] {
  return Array.from(connections.values())
}

export function getActiveConnections(): McpConnection[] {
  return listConnections().filter((c) => c.status === "connected")
}

export function updateConnectionStatus(
  id: string,
  status: McpConnectionStatus,
  error?: string
): McpConnection | undefined {
  const conn = connections.get(id)
  if (!conn) return undefined
  conn.status = status
  conn.error = error
  conn.updatedAt = Date.now()
  return conn
}

export function updateTools(
  id: string,
  tools: McpToolDefinition[]
): McpConnection | undefined {
  const conn = connections.get(id)
  if (!conn) return undefined
  conn.tools = tools
  conn.updatedAt = Date.now()
  return conn
}

export function removeConnection(id: string): boolean {
  return connections.delete(id)
}

/**
 * Find which server provides a given tool.
 * Returns the first connected server that has the tool.
 */
export function findServerForTool(toolName: string): McpConnection | undefined {
  for (const conn of connections.values()) {
    if (conn.status !== "connected") continue
    if (conn.tools.some((t) => t.name === toolName)) return conn
  }
  return undefined
}

/**
 * Get all tools from all connected servers, prefixed with server ID to avoid collisions.
 */
export function getAllTools(): Array<McpToolDefinition & { serverId: string; serverName: string }> {
  const tools: Array<McpToolDefinition & { serverId: string; serverName: string }> = []
  for (const conn of connections.values()) {
    if (conn.status !== "connected") continue
    for (const tool of conn.tools) {
      tools.push({ ...tool, serverId: conn.id, serverName: conn.serverName })
    }
  }
  return tools
}
