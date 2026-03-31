import { NextResponse } from "next/server"

/**
 * GET /api/openclaw/ws-token
 * Returns the Gateway WebSocket URL and auth token for client-side connections.
 * Used by use-gateway-ws.ts to bootstrap the WS handshake.
 */
export async function GET() {
  return NextResponse.json({
    url: process.env.NEXT_PUBLIC_GATEWAY_WS_URL || "ws://127.0.0.1:18789",
    token: process.env.OPENCLAW_GATEWAY_TOKEN || "xo",
  })
}
