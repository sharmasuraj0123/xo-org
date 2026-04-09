import { NextResponse } from "next/server"
import { getAgent } from "../../lib/openclaw-store"
import { connectToGateway, type GatewayConfig } from "../../lib/openclaw-gateway"
import { getSessionHistory } from "../../lib/openclaw-adapter"

/**
 * POST /api/openclaw/chat
 *
 * Send a message to an agent via the OpenClaw Gateway WebSocket
 * and poll sessions_history for the response.
 *
 * The gateway's HTTP /tools/invoke only supports read tools (sessions_list,
 * sessions_history). Sending messages requires WebSocket — matching how
 * the OpenClaw Control UI works.
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

  // Look up agent config
  const agent = getAgent(agentId)
  if (!agent?.gatewayUrl || !agent?.gatewayToken) {
    return NextResponse.json(
      { ok: false, error: "Agent has no gateway config. Connect it via the Connect Agent page." },
      { status: 400 }
    )
  }

  const key = sessionKey || `agent:${agentId}:main`
  const httpUrl = agent.gatewayUrl.replace(/^wss:/, "https:").replace(/^ws:/, "http:")

  try {
    // Connect via WebSocket and send the message
    const config: GatewayConfig = {
      url: agent.gatewayUrl,
      authToken: agent.gatewayToken,
      disableDeviceAuth: true,
    }

    const client = await connectToGateway(config)

    // Send user message via WebSocket
    const sendRes = await client.sendRequest("sessions.send", {
      sessionKey: key,
      message: { role: "user", content: [{ type: "text", text: message }] },
    }, 15000)

    client.close()

    if (!sendRes.ok) {
      // If sessions.send doesn't work, try alternative methods
      const errMsg = sendRes.error?.message ?? "unknown"
      const hint = errMsg.includes("scope")
        ? " — ensure the gateway token has write permissions and device auth is configured correctly"
        : ""
      return NextResponse.json(
        { ok: false, error: `Gateway rejected message: ${errMsg}${hint}` },
        { status: 502 }
      )
    }

    // Poll for assistant response via HTTP sessions_history
    let responseText = ""
    const maxAttempts = 15
    const pollInterval = 2000

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, pollInterval))

      try {
        const history = (await getSessionHistory(key, 10, httpUrl, agent.gatewayToken)) as {
          details?: {
            messages?: Array<{
              role: string
              content: Array<{ type: string; text?: string }>
              timestamp?: number
            }>
          }
        }

        const messages = history?.details?.messages ?? []
        const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")
        if (lastAssistant?.content) {
          const textParts = lastAssistant.content
            .filter((p) => p.type === "text" && p.text)
            .map((p) => p.text)
          if (textParts.length > 0) {
            responseText = textParts.join("\n")
            break
          }
        }
      } catch {
        // Gateway might not have processed yet
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
