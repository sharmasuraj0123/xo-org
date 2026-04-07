/**
 * MCP tool executor for agents.
 *
 * Unlike other connectors with static tool lists, MCP tools are
 * discovered dynamically from connected servers at runtime.
 */

import { mcpCallTool } from "./mcp"
import { findServerForTool, getAllTools } from "./mcp-store"
import type { McpToolResult } from "./types"

/**
 * List all available tools across all connected MCP servers.
 */
export function listAvailableTools() {
  return getAllTools()
}

/**
 * Execute a tool on the appropriate MCP server.
 * Automatically routes to the server that provides the tool.
 */
export async function executeMcpTool(
  toolName: string,
  params: Record<string, unknown>,
  serverId?: string
): Promise<McpToolResult> {
  // Find the server that has this tool
  let conn
  if (serverId) {
    const { getConnection } = await import("./mcp-store")
    conn = getConnection(serverId)
    if (!conn || conn.status !== "connected") {
      return { tool: toolName, serverId: serverId, ok: false, error: `MCP server '${serverId}' is not connected` }
    }
  } else {
    conn = findServerForTool(toolName)
  }

  if (!conn) {
    return { tool: toolName, serverId: "", ok: false, error: `No connected MCP server provides tool '${toolName}'` }
  }

  try {
    const result = await mcpCallTool(conn.config, toolName, params)
    return { tool: toolName, serverId: conn.id, ok: true, data: result }
  } catch (err) {
    return {
      tool: toolName,
      serverId: conn.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}
