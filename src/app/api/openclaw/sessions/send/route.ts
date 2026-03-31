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
    // sessions_send blocks until the agent finishes its full turn (can be 30s+).
    // We fire the request without awaiting completion — the frontend polls
    // /history to observe the reply as it arrives.
    fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GATEWAY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool: "sessions_send",
        args: { sessionKey, message: message.trim() },
      }),
      // Long timeout to allow the agent to finish, but we don't await it
      signal: AbortSignal.timeout(120000),
    }).catch(() => {
      // Silently ignore — client polls history for the result
    })

    // Return immediately so the UI can start polling
    return NextResponse.json({ ok: true, queued: true })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: "Failed to dispatch message", detail },
      { status: 502 }
    )
  }
}
