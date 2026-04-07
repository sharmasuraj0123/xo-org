import { NextResponse } from "next/server"
import { isGmailConfigured } from "../../lib/gmail"
import { getActiveConnection } from "../../lib/gmail-store"

/**
 * GET /api/gmail/status
 *
 * Returns the current Gmail connection status.
 */
export async function GET() {
  if (!isGmailConfigured()) {
    return NextResponse.json({
      ok: true,
      data: {
        configured: false,
        connected: false,
        connection: null,
      },
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
            email: connection.email,
            displayName: connection.displayName,
            avatarUrl: connection.avatarUrl,
            status: connection.status,
            scopes: connection.scopes,
            connectedAt: connection.connectedAt,
            updatedAt: connection.updatedAt,
          }
        : null,
    },
  })
}
