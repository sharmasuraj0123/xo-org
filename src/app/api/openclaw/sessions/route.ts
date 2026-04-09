import { NextResponse } from "next/server"
import { listAgents } from "../../lib/openclaw-store"
import { gatewayToolInvoke } from "../../lib/openclaw-gateway"

/**
 * Fetches the live session list from all connected OpenClaw gateways.
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
  try {
    const result = (await gatewayToolInvoke(gatewayUrl, gatewayToken, "sessions_list", {}, 5000)) as {
      details?: { sessions: GatewaySession[]; count: number }
    }
    return result?.details?.sessions ?? []
  } catch {
    return []
  }
}

export async function GET() {
  try {
    // Collect unique gateway URLs from connected agents + default
    const gateways = new Map<string, string>()

    if (DEFAULT_GATEWAY_URL) {
      gateways.set(DEFAULT_GATEWAY_URL, DEFAULT_GATEWAY_TOKEN)
    }

    for (const agent of listAgents()) {
      if (agent.url && !gateways.has(agent.url)) {
        gateways.set(agent.url, agent.webhookAuthHeader)
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
