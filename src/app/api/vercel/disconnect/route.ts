import { NextResponse } from "next/server"
import { getActiveConnection, removeConnection } from "../../lib/vercel-store"

export async function DELETE() {
  const connection = getActiveConnection()
  if (!connection) {
    return NextResponse.json({ ok: false, error: "No active Vercel connection" }, { status: 404 })
  }
  // Vercel has no token revocation API — user must uninstall from dashboard
  removeConnection(connection.installationId)
  return NextResponse.json({ ok: true, data: { disconnected: true } })
}
