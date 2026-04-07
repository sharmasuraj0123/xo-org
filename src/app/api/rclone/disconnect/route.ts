import { NextResponse } from "next/server"
import { getActiveConnection, removeConnection } from "../../lib/rclone-store"

export async function DELETE() {
  const connection = getActiveConnection()
  if (!connection) {
    return NextResponse.json({ ok: false, error: "No active rclone connection" }, { status: 404 })
  }
  removeConnection()
  return NextResponse.json({ ok: true, data: { disconnected: true } })
}
