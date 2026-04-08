import { NextResponse } from "next/server"
import { getAgent } from "../../lib/openclaw-store"
import { invokeAgent, getSessionHistory } from "../../lib/openclaw-adapter"

/**
 * POST /api/openclaw/chat
 *
 * Send a message to an agent via the OpenClaw Gateway and poll for response.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const { agentId, sessionKey, message } = body as {
    agentId?: string
    sessionKey?: string
    message?: string
  }

  if (!agentId || !message) {
    return NextResponse.json({ ok: false, error: "agentId and message required" }, { status: 400 })
  }

  // Look up agent config from openclaw store
  const agent = getAgent(agentId)
  const gatewayUrl = agent?.gatewayUrl || process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789"
  const gatewayToken = agent?.gatewayToken || process.env.OPENCLAW_GATEWAY_TOKEN || ""
  const key = sessionKey || `agent:${agentId}:main`

  try {
    // Send message through gateway
    await invokeAgent(gatewayUrl, gatewayToken, key, message)

    // Poll for response — gateway processes async, so we wait briefly then check history
    let responseText = ""
    const maxAttempts = 15
    const pollInterval = 2000

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, pollInterval))

      try {
        const history = (await getSessionHistory(key, 5, gatewayUrl, gatewayToken)) as {
          details?: {
            messages?: Array<{ role: string; content: string; timestamp?: number }>
          }
        }

        const messages = history?.details?.messages ?? []
        // Find the latest assistant message after our user message
        const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")
        if (lastAssistant?.content) {
          responseText = lastAssistant.content
          break
        }
      } catch {
        // Gateway might not have processed yet, continue polling
      }
    }

    if (!responseText) {
      responseText = "Agent is processing your request. Check back shortly."
    }

    return NextResponse.json({ ok: true, data: { response: responseText, sessionKey: key } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 502 })
  }
}
