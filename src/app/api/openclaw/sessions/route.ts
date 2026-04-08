import { NextResponse } from "next/server"
import { listAgents } from "../../lib/openclaw-store"

/**
 * Fetches the live session list from all connected OpenClaw Gateways.
 *
 * Queries each connected agent's gateway URL for sessions,
 * plus the default env gateway as fallback.
 */

const DEFAULT_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || ""
const DEFAULT_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ""

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

async function fetchSessions(gatewayUrl: string, gatewayToken: string): Promise<GatewaySession[]> {
  // Convert ws:// to http:// for the HTTP API
  const httpUrl = gatewayUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:")

  const res = await fetch(`${httpUrl}/tools/invoke`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${gatewayToken}`,
      "x-openclaw-token": gatewayToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tool: "sessions_list", args: {} }),
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) return []

  const body = await res.json() as {
    ok: boolean
    result?: { details?: { sessions: GatewaySession[]; count: number } }
  }

  return body.ok ? (body.result?.details?.sessions ?? []) : []
}

export async function GET() {
  try {
    // Collect unique gateway URLs from connected agents + default
    const gateways = new Map<string, string>()

    if (DEFAULT_GATEWAY_URL) {
      gateways.set(DEFAULT_GATEWAY_URL, DEFAULT_GATEWAY_TOKEN)
    }

    for (const agent of listAgents()) {
      if (agent.gatewayUrl && !gateways.has(agent.gatewayUrl)) {
        gateways.set(agent.gatewayUrl, agent.gatewayToken)
      }
    }

    if (gateways.size === 0) {
      return NextResponse.json({ sessions: [], count: 0 })
    }

    // Query all gateways in parallel
    const results = await Promise.allSettled(
      Array.from(gateways.entries()).map(([url, token]) => fetchSessions(url, token))
    )

    const allSessions: GatewaySession[] = []
    for (const result of results) {
      if (result.status === "fulfilled") {
        allSessions.push(...result.value)
      }
    }

    return NextResponse.json({
      sessions: allSessions,
      count: allSessions.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: "Failed to reach OpenClaw Gateway", detail: message },
      { status: 502 }
    )
  }
}
