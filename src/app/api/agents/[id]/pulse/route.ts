import { NextResponse } from "next/server"
import { updateAgentPulse } from "../../../lib/bridge"
import { requireAuth } from "../../../lib/auth"

// PUT /api/agents/:id/pulse — heartbeat
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth instanceof Response) return auth

  const { id } = await params
  const body = await req.json()
  const agent = updateAgentPulse(id, body)

  if (!agent) {
    return NextResponse.json({ ok: false, error: "Agent not found" }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    data: {
      nextPulseBy: new Date(Date.now() + 30000).toISOString(),
      pendingTasks: agent.activeTasks,
      serverTime: new Date().toISOString(),
    },
  })
}
