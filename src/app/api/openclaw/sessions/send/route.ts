import { NextRequest, NextResponse } from "next/server"

/**
 * POST /api/openclaw/sessions/send
 *
 * Sends a message into an OpenClaw session via the Gateway tools invoke API.
 *
 * Body:
 *   sessionKey  - required: full Gateway session key (e.g. "agent:main:main")
 *   message     - required: text message to send
 *
 * The Gateway calls sessions_send which injects the message into the session
 * and triggers the agent to respond. Poll /api/openclaw/sessions/history to
 * observe the reply stream.
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789"
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "xo"

export async function POST(request: NextRequest) {
  let body: { sessionKey?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { sessionKey, message } = body

  if (!sessionKey || !message?.trim()) {
    return NextResponse.json(
      { error: "sessionKey and message are required" },
      { status: 400 }
    )
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GATEWAY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool: "sessions_send",
        args: { sessionKey, message: message.trim() },
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Gateway returned ${res.status}` },
        { status: 502 }
      )
    }

    const data = await res.json() as { ok: boolean; error?: string; result?: unknown }

    if (!data.ok) {
      return NextResponse.json(
        { error: data.error ?? "Gateway error" },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true, result: data.result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: "Failed to reach OpenClaw Gateway", detail: message },
      { status: 502 }
    )
  }
}
