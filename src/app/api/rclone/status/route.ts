import { NextResponse } from "next/server"
import { getActiveConnection } from "../../lib/rclone-store"

export async function GET() {
  const connection = getActiveConnection()
  return NextResponse.json({
    ok: true,
    data: {
      connected: connection?.status === "connected",
      connection: connection
        ? {
            rcloneVersion: connection.rcloneVersion,
            configPath: connection.configPath,
            remotes: connection.remotes,
            status: connection.status,
            connectedAt: connection.connectedAt,
          }
        : null,
    },
  })
}
