import { NextResponse } from "next/server"
import { listChannels, createChannel } from "../lib/bridge"
import { requireAuth, requirePermission } from "../lib/auth"

// GET /api/channels — list all channels
export async function GET(req: Request) {
  const auth = requireAuth(req)
  if (auth instanceof Response) return auth

  return NextResponse.json({ ok: true, data: listChannels() })
}

// POST /api/channels — create channel (admin only)
export async function POST(req: Request) {
  const auth = requirePermission(req, "admin")
  if (auth instanceof Response) return auth

  const body = await req.json()
  const { name, topic } = body

  if (!name) {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 })
  }

  const channel = createChannel(name, auth.agentId, topic)
  return NextResponse.json({ ok: true, data: channel }, { status: 201 })
}
