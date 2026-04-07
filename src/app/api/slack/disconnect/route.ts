import { NextResponse } from "next/server"
import { revokeSlackToken, decryptToken } from "../../lib/slack"
import { getActiveConnection, removeConnection } from "../../lib/slack-store"

/**
 * DELETE /api/slack/disconnect
 */
export async function DELETE() {
  const connection = getActiveConnection()
  if (!connection) {
    return NextResponse.json(
      { ok: false, error: "No active Slack connection" },
      { status: 404 }
    )
  }

  try {
    const token = await decryptToken(connection.encryptedBotToken)
    await revokeSlackToken(token)
  } catch (err) {
    console.error("Failed to revoke Slack token:", err)
  }

  removeConnection(connection.teamId)

  return NextResponse.json({ ok: true, data: { disconnected: true } })
}
