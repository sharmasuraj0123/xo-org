import { NextResponse } from "next/server"

/**
 * GET /api/openclaw/ws-token
 *
 * Returns the WebSocket URL and auth token for the browser to connect
 * to the OpenClaw Gateway.
 *
 * The browser connects to /api/gateway/ws on the same origin (served by
 * server.mjs), which proxies the WS connection to the local Gateway.
 * This avoids the browser trying to reach ws://127.0.0.1:18789 directly,
 * which fails in cloud/remote environments.
 */
export async function GET() {
  // In production or when NEXT_PUBLIC_GATEWAY_WS_URL is set explicitly, use that.
  // Otherwise default to the same-origin proxy path.
  const explicitUrl = process.env.NEXT_PUBLIC_GATEWAY_WS_URL
  const token = process.env.OPENCLAW_GATEWAY_TOKEN || "xo"

  // Use relative WS path — browser will resolve to same host:port
  // e.g. ws://localhost:3006/api/gateway/ws
  const url = explicitUrl || "__RELATIVE__"

  return NextResponse.json({ url, token })
}
