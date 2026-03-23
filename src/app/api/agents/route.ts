import { NextResponse } from "next/server"
import { registerAgent, listAgents } from "../lib/bridge"
import { generateToken } from "../lib/auth"

// GET /api/agents — list all agents
export async function GET() {
  const agents = listAgents().map(({ cursor, lastPulse, connectedAt, ...rest }) => rest)
  return NextResponse.json({ ok: true, data: agents })
}

// POST /api/agents — register a new agent
export async function POST(req: Request) {
  const body = await req.json()
  const { id, name, role, model, channels, capacity } = body

  if (!id) {
    return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 })
  }

  const existing = listAgents().find((a) => a.id === id)
  if (existing) {
    return NextResponse.json({ ok: false, error: "Agent already registered" }, { status: 409 })
  }

  const agent = registerAgent({ id, name, role, model, channels, capacity })
  const token = generateToken(agent.id)

  return NextResponse.json(
    {
      ok: true,
      data: {
        token,
        agentId: agent.id,
        serverId: "xo-org-main",
        cursor: agent.cursor,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    },
    { status: 201 }
  )
}
