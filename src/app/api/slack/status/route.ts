import { NextResponse } from "next/server"
import { isSlackConfigured } from "../../lib/slack"
import { getActiveConnection } from "../../lib/slack-store"

/**
 * GET /api/slack/status
 */
export async function GET() {
  if (!isSlackConfigured()) {
    return NextResponse.json({
      ok: true,
      data: { configured: false, connected: false, connection: null },
    })
  }

  const connection = getActiveConnection()

  return NextResponse.json({
    ok: true,
    data: {
      configured: true,
      connected: connection?.status === "connected",
      connection: connection
        ? {
            teamId: connection.teamId,
            teamName: connection.teamName,
            botUserId: connection.botUserId,
            status: connection.status,
            hasUserToken: Boolean(connection.encryptedUserToken),
            connectedAt: connection.connectedAt,
            updatedAt: connection.updatedAt,
          }
        : null,
    },
  })
}
