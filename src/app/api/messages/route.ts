import { NextResponse } from "next/server"
import { appendMessage, readMessages, notifySubscribers } from "../lib/bridge"
import { requireAuth } from "../lib/auth"

// GET /api/messages?cursor=0 — poll new messages
export async function GET(req: Request) {
  const auth = requireAuth(req)
  if (auth instanceof Response) return auth

  const url = new URL(req.url)
  const cursor = parseInt(url.searchParams.get("cursor") ?? "0", 10)

  const { messages, nextCursor } = readMessages(cursor, auth.agentId)

  return NextResponse.json({
    ok: true,
    data: messages,
    cursor: nextCursor,
    hasMore: false,
  })
}

// POST /api/messages — send a message
export async function POST(req: Request) {
  const auth = requireAuth(req)
  if (auth instanceof Response) return auth

  const body = await req.json()
  const { to, type, payload, ref } = body

  if (!to || !type || !payload?.text) {
    return NextResponse.json(
      { ok: false, error: "to, type, and payload.text are required" },
      { status: 400 }
    )
  }

  const msg = appendMessage(auth.agentId, to, type, payload, ref)

  // Fan-out to SSE subscribers
  notifySubscribers(msg)

  return NextResponse.json(
    {
      ok: true,
      data: {
        id: msg.id,
        ts: msg.ts,
        routed: msg.routed,
      },
    },
    { status: 202 }
  )
}
