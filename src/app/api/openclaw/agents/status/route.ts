import { NextResponse } from "next/server"
import { listAgents } from "../../../lib/openclaw-store"

export async function GET() {
  const agents = listAgents()
  return NextResponse.json({
    ok: true,
    data: {
      connected: agents.some((a) => a.status === "connected"),
      agents: agents.map((a) => ({
        agentId: a.agentId,
        name: a.name,
        role: a.role,
        model: a.model,
        modelProvider: a.modelProvider,
        channels: a.channels,
        adapterType: a.adapterType,
        gatewayUrl: a.gatewayUrl,
        heartbeat: a.heartbeat,
        status: a.status,
        error: a.error,
        totalRuns: a.totalRuns,
        lastHeartbeatAt: a.lastHeartbeatAt,
        connectedAt: a.connectedAt,
      })),
    },
  })
}
