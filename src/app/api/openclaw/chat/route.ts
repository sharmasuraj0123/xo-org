import { NextResponse } from "next/server"
import { getAgent, updateAgent } from "../../lib/openclaw-store"
import {
  executeAgent,
  type GatewayConfig, type WakeContext,
} from "../../lib/openclaw-gateway"
import {
  invokeAgent,
  getSessionHistory,
} from "../../lib/openclaw-adapter"

/**
 * POST /api/openclaw/chat
 *
 * Send a message to an agent via the Paperclip adapter pattern.
 *
 * Strategy:
 *  1. Try WebSocket V3 protocol (executeAgent)
 *  2. If WS fails, fall back to HTTP adapter (invokeAgent + poll history)
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const { agentId, message, sessionKey: requestedSessionKey } = body as {
    agentId?: string
    message?: string
    sessionKey?: string
  }

  if (!agentId || !message) {
    return NextResponse.json({ ok: false, error: "agentId and message required" }, { status: 400 })
  }

  const agent = getAgent(agentId)
  if (!agent?.gatewayUrl || !agent?.gatewayToken) {
    return NextResponse.json(
      { ok: false, error: "Agent has no gateway config. Connect it via the Connect Agent page." },
      { status: 400 }
    )
  }

  const runId = `run_${Date.now().toString(16)}_${Math.random().toString(36).slice(2, 8)}`

  const gatewayConfig: GatewayConfig = {
    url: agent.gatewayUrl,
    authToken: agent.gatewayToken || undefined,
    password: agent.gatewayPassword,
    privateKeyPem: agent.privateKeyPem,
    disableDeviceAuth: agent.disableDeviceAuth,
    autoPairOnFirstConnect: agent.autoPairOnFirstConnect,
    sessionKeyStrategy: agent.sessionKeyStrategy,
    sessionKey: agent.fixedSessionKey,
    payloadTemplate: agent.payloadTemplate,
    timeoutSec: 120,
  }

  const wakeCtx: WakeContext = {
    runId,
    agentId,
    agentName: agent.name,
    wakeReason: "chat",
    promptTemplate: message,
  }

  // ── Strategy 1: WebSocket V3 (executeAgent) ──────────────────
  try {
    const result = await executeAgent(gatewayConfig, wakeCtx)

    updateAgent(agentId, {
      lastHeartbeatAt: Date.now(),
      totalRuns: agent.totalRuns + 1,
    })

    const responseText = result.resultText ?? result.error ?? "No response from agent."

    return NextResponse.json({ ok: true, data: { response: responseText } })
  } catch (wsErr) {
    const wsMsg = wsErr instanceof Error ? wsErr.message : String(wsErr)
    console.error(`[openclaw-chat] WS failed: ${wsMsg}, trying HTTP fallback...`)

    // ── Strategy 2: HTTP adapter fallback ─────────────────────────
    // Convert ws:// → http:// for the REST API
    const httpUrl = agent.gatewayUrl
      .replace(/^wss:/, "https:")
      .replace(/^ws:/, "http:")
    const sessionKey = requestedSessionKey ?? `agent:${agentId}:default`

    try {
      await invokeAgent(httpUrl, agent.gatewayToken, sessionKey, message)

      // Poll for the agent's response (up to 60s)
      let responseText: string | null = null
      const maxAttempts = 20
      const pollIntervalMs = 3000

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, pollIntervalMs))

        const history = (await getSessionHistory(
          sessionKey,
          5,
          httpUrl,
          agent.gatewayToken
        )) as {
          details?: {
            messages?: Array<{
              role: string
              content: Array<{ type: string; text?: string }>
            }>
          }
        }

        const messages = history?.details?.messages ?? []
        // Find the last assistant message after our user message
        const lastAssistant = messages
          .filter((m) => m.role === "assistant")
          .at(-1)

        if (lastAssistant) {
          const text = lastAssistant.content
            ?.filter((c) => c.type === "text" && c.text)
            .map((c) => c.text!)
            .join("\n")
            .trim()

          if (text) {
            responseText = text
            break
          }
        }
      }

      updateAgent(agentId, {
        lastHeartbeatAt: Date.now(),
        totalRuns: agent.totalRuns + 1,
      })

      if (responseText) {
        return NextResponse.json({ ok: true, data: { response: responseText } })
      }

      return NextResponse.json(
        { ok: false, error: "Agent did not respond within timeout." },
        { status: 504 }
      )
    } catch (httpErr) {
      const httpMsg = httpErr instanceof Error ? httpErr.message : String(httpErr)
      // Return the original WS error + HTTP fallback error
      return NextResponse.json(
        { ok: false, error: `WS: ${wsMsg} | HTTP fallback: ${httpMsg}` },
        { status: 502 }
      )
    }
  }
}
