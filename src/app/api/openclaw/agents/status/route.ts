import { NextResponse } from "next/server"
import { isOpenClawConfigured, pingGateway } from "../../../lib/openclaw-adapter"
import { listAgents } from "../../../lib/openclaw-store"

export async function GET() {
  if (!isOpenClawConfigured()) {
    return NextResponse.json({
      ok: true,
      data: { configured: false, gatewayReachable: false, agents: [] },
    })
  }

  const agents = listAgents()
  let gatewayReachable = false
  let gatewayLatency = 0

  try {
    const ping = await pingGateway()
    gatewayReachable = ping.ok
    gatewayLatency = ping.latencyMs
  } catch { /* ignore */ }

  return NextResponse.json({
    ok: true,
    data: {
      configured: true,
      gatewayReachable,
      gatewayLatency,
      connected: agents.some((a) => a.status === "connected"),
      agents: agents.map((a) => ({
        agentId: a.agentId,
        sessionKey: a.sessionKey,
        name: a.name,
        role: a.role,
        model: a.model,
        channels: a.channels,
        status: a.status,
        totalTokens: a.totalTokens,
        connectedAt: a.connectedAt,
      })),
    },
  })
}
