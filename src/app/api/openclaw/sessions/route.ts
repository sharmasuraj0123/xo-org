import { NextResponse } from "next/server"

/**
 * Fetches the live session list from the OpenClaw Gateway via HTTP Tools Invoke API.
 *
 * Uses POST /tools/invoke instead of CLI exec — ~35ms vs ~5400ms.
 *
 * The Gateway exposes a direct HTTP endpoint at /tools/invoke that accepts
 * tool calls with Bearer auth. This avoids forking a new Node.js process for
 * every request (the CLI exec approach had ~5s startup overhead each time).
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789"
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ""

export type GatewaySession = {
  key: string
  kind: string
  chatType: string
  sessionId: string
  updatedAt: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  contextTokens: number
  model: string
  modelProvider: string
  origin?: {
    provider?: string
    label?: string
    from?: string
    surface?: string
    chatType?: string
  }
  lastChannel?: string
  deliveryContext?: Record<string, string>
}

export async function GET() {
  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GATEWAY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ tool: "sessions_list", args: {} }),
      // Short timeout — Gateway is local, should respond in <100ms
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Gateway returned ${res.status}` },
        { status: 502 }
      )
    }

    const body = await res.json() as {
      ok: boolean
      result?: { details?: { sessions: GatewaySession[]; count: number } }
      error?: string
    }

    if (!body.ok) {
      return NextResponse.json({ error: body.error ?? "Gateway error" }, { status: 502 })
    }

    const details = body.result?.details
    return NextResponse.json({
      sessions: details?.sessions ?? [],
      count: details?.count ?? 0,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: "Failed to reach OpenClaw Gateway", detail: message },
      { status: 502 }
    )
  }
}
