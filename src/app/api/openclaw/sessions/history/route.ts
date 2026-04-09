import { NextRequest, NextResponse } from "next/server"
import { gatewayToolInvoke } from "../../../lib/openclaw-gateway"

/**
 * Fetches chat history for a specific OpenClaw session.
 *
 * Query params:
 *   sessionKey  - required: the full session key (e.g. "agent:main:main")
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

  if (!GATEWAY_URL) {
    return NextResponse.json({ error: "OPENCLAW_GATEWAY_URL not configured" }, { status: 500 })
  }

  try {
    const result = (await gatewayToolInvoke(GATEWAY_URL, GATEWAY_TOKEN, "sessions_history", { sessionKey, limit }, 8000)) as {
      details?: {
        sessionKey: string
        messages: GatewayMessage[]
      }
      content?: Array<{ type: string; text?: string }>
    }

    // sessions_history returns details.messages directly
    if (result?.details?.messages) {
      return NextResponse.json({
        sessionKey: result.details.sessionKey,
        messages: result.details.messages,
      })
    }

    // Fallback: parse from text content
    const textContent = result?.content?.find((c) => c.type === "text")?.text
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
