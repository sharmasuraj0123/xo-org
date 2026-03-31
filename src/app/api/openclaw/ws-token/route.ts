import { NextRequest, NextResponse } from "next/server"

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
export async function GET(request: NextRequest) {
  const explicitUrl = process.env.NEXT_PUBLIC_GATEWAY_WS_URL
  const token = process.env.OPENCLAW_GATEWAY_TOKEN || "xo"

  // Build the WS URL from the incoming request's host so it works
  // behind any proxy (Coder, Gitpod, Codespaces, localhost, etc.)
  let url: string
  if (explicitUrl) {
    url = explicitUrl
  } else {
    const host = request.headers.get("host") || "localhost:3006"
    const proto = request.headers.get("x-forwarded-proto") || "http"
    const wsProto = proto === "https" ? "wss" : "ws"
    url = `${wsProto}://${host}/api/gateway/ws`
  }

  return NextResponse.json({ url, token })
}
