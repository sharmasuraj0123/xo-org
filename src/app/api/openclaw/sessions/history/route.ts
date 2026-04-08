import { NextRequest, NextResponse } from "next/server"

/**
 * Fetches chat history for a specific OpenClaw session via HTTP Tools Invoke API.
 *
 * Uses POST /tools/invoke instead of CLI exec — ~50ms vs ~5400ms.
 *
 * Query params:
 *   sessionKey  - required: the full Gateway session key (e.g. "agent:main:main")
 *   limit       - optional: number of messages to return (default 100)
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || ""
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ""

export type GatewayMessage = {
  role: "user" | "assistant" | "toolCall" | "toolResult"
  content: Array<{ type: string; text?: string; name?: string; arguments?: unknown }>
  timestamp?: number
  model?: string
  usage?: {
    input?: number
    output?: number
    totalTokens?: number
    cost?: { total?: number }
  }
  toolName?: string
  toolCallId?: string
  isError?: boolean
}

export async function GET(request: NextRequest) {
  const sessionKey = request.nextUrl.searchParams.get("sessionKey")
  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "100", 10)

  if (!sessionKey) {
    return NextResponse.json({ error: "sessionKey is required" }, { status: 400 })
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
      method: "POST",
      headers: {
        "x-openclaw-token": GATEWAY_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool: "sessions_history",
        args: { sessionKey, limit },
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Gateway returned ${res.status}` },
        { status: 502 }
      )
    }

    const body = await res.json() as {
      ok: boolean
      result?: {
        details?: {
          sessionKey: string
          messages: GatewayMessage[]
        }
        content?: Array<{ type: string; text?: string }>
      }
      error?: string
    }

    if (!body.ok) {
      return NextResponse.json({ error: body.error ?? "Gateway error" }, { status: 502 })
    }

    // sessions_history returns details.messages directly
    const details = body.result?.details
    if (details?.messages) {
      return NextResponse.json({
        sessionKey: details.sessionKey,
        messages: details.messages,
      })
    }

    // Fallback: parse from text content (tools_invoke text blob)
    const textContent = body.result?.content?.find((c) => c.type === "text")?.text
    if (textContent) {
      try {
        const parsed = JSON.parse(textContent)
        return NextResponse.json(parsed)
      } catch {
        return NextResponse.json({ error: "Failed to parse Gateway response" }, { status: 502 })
      }
    }

    return NextResponse.json({ error: "Empty response from Gateway" }, { status: 502 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: "Failed to reach OpenClaw Gateway", detail: message },
      { status: 502 }
    )
  }
}
