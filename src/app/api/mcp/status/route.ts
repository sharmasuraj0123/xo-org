import { NextResponse } from "next/server"
import { listConnections } from "../../lib/mcp-store"

export async function GET() {
  const connections = listConnections()
  return NextResponse.json({
    ok: true,
    data: {
      connected: connections.some((c) => c.status === "connected"),
      servers: connections.map((c) => ({
        id: c.id,
        name: c.config.name,
        serverName: c.serverName,
        serverVersion: c.serverVersion,
        transport: c.config.transport,
        toolCount: c.tools.length,
        status: c.status,
        error: c.error,
        connectedAt: c.connectedAt,
      })),
    },
  })
}
