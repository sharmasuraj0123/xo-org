import { NextResponse } from "next/server"
import { isVercelConfigured } from "../../lib/vercel"
import { getActiveConnection } from "../../lib/vercel-store"

export async function GET() {
  if (!isVercelConfigured()) {
    return NextResponse.json({ ok: true, data: { configured: false, connected: false, connection: null } })
  }
  const connection = getActiveConnection()
  return NextResponse.json({
    ok: true,
    data: {
      configured: true,
      connected: connection?.status === "connected",
      connection: connection
        ? {
            username: connection.username,
            email: connection.email,
            teamId: connection.teamId,
            installationId: connection.installationId,
            status: connection.status,
            connectedAt: connection.connectedAt,
          }
        : null,
    },
  })
}
