import { NextResponse } from "next/server"
import { getRcloneVersion, getRcloneConfigPath, listRemotes } from "../../lib/rclone"
import { saveConnection } from "../../lib/rclone-store"

/**
 * POST /api/rclone/connect
 * Detect rclone binary, read config, list remotes, and store connection.
 */
export async function POST() {
  try {
    const [version, configPath, remotes] = await Promise.all([
      getRcloneVersion(),
      getRcloneConfigPath(),
      listRemotes(),
    ])

    const connection = saveConnection(version, configPath, remotes)

    return NextResponse.json({
      ok: true,
      data: {
        rcloneVersion: connection.rcloneVersion,
        configPath: connection.configPath,
        remotes: connection.remotes,
        status: connection.status,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isNotFound = message.includes("ENOENT") || message.includes("not found")
    return NextResponse.json(
      {
        ok: false,
        error: isNotFound
          ? "rclone binary not found. Install it from https://rclone.org/install/"
          : `Failed to connect: ${message}`,
      },
      { status: isNotFound ? 404 : 500 }
    )
  }
}
