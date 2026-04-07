import { NextResponse } from "next/server"
import { getConnection, removeConnection } from "../../lib/mcp-store"
import { killStdioProcess } from "../../lib/mcp"

/**
 * DELETE /api/mcp/disconnect?id=serverId
 * Disconnect a specific MCP server, or all servers if no id given.
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (id) {
    const conn = getConnection(id)
    if (!conn) {
      return NextResponse.json({ ok: false, error: `No MCP server with id '${id}'` }, { status: 404 })
    }
    if (conn.config.transport === "stdio") killStdioProcess(id)
    removeConnection(id)
    return NextResponse.json({ ok: true, data: { disconnected: true, id } })
  }

  // Disconnect all
  const { listConnections } = await import("../../lib/mcp-store")
  const all = listConnections()
  for (const conn of all) {
    if (conn.config.transport === "stdio") killStdioProcess(conn.id)
    removeConnection(conn.id)
  }

  return NextResponse.json({ ok: true, data: { disconnected: true, count: all.length } })
}
