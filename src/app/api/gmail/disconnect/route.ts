import { NextResponse } from "next/server"
import { revokeToken, decryptToken } from "../../lib/gmail"
import {
  getActiveConnection,
  removeConnection,
} from "../../lib/gmail-store"

/**
 * DELETE /api/gmail/disconnect
 *
 * Disconnects the Gmail account. Revokes the token with Google
 * and removes the stored connection.
 */
export async function DELETE() {
  const connection = getActiveConnection()

  if (!connection) {
    return NextResponse.json(
      { ok: false, error: "No active Gmail connection" },
      { status: 404 }
    )
  }

  // Revoke the refresh token with Google
  try {
    const refreshToken = await decryptToken(connection.encryptedRefreshToken)
    await revokeToken(refreshToken)
  } catch (err) {
    console.error("Failed to revoke Gmail token:", err)
    // Continue with local removal even if revocation fails
  }

  removeConnection(connection.email)

  return NextResponse.json({
    ok: true,
    data: { disconnected: true },
  })
}
