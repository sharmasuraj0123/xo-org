import { NextResponse } from "next/server"
import { getAgent, removeAgent } from "../../lib/bridge"
import { requireAuth } from "../../lib/auth"

// GET /api/agents/:id — agent details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const agent = getAgent(id)

  if (!agent) {
    return NextResponse.json({ ok: false, error: "Agent not found" }, { status: 404 })
  }

  const { cursor, lastPulse, connectedAt, ...publicAgent } = agent
  return NextResponse.json({ ok: true, data: publicAgent })
}

// DELETE /api/agents/:id — disconnect agent
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth instanceof Response) return auth

  const { id } = await params
  const removed = removeAgent(id)

  if (!removed) {
    return NextResponse.json({ ok: false, error: "Agent not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, data: { agentId: id, disconnected: true } })
}
