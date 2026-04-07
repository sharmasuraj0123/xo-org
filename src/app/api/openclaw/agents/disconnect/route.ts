import { NextResponse } from "next/server"
import { getAgent, removeAgent } from "../../../lib/openclaw-store"
import { removeAgent as removeBridgeAgent } from "../../../lib/bridge"

/**
 * DELETE /api/openclaw/agents/disconnect?agentId=...
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get("agentId")

  if (!agentId) {
    return NextResponse.json({ ok: false, error: "agentId query param required" }, { status: 400 })
  }

  const agent = getAgent(agentId)
  if (!agent) {
    return NextResponse.json({ ok: false, error: `Agent '${agentId}' not found` }, { status: 404 })
  }

  // Remove from bridge
  removeBridgeAgent(agentId)
  // Remove from OpenClaw store
  removeAgent(agentId)

  return NextResponse.json({ ok: true, data: { disconnected: true, agentId } })
}
