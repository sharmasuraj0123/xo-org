import { NextResponse } from "next/server"
import { getAgent, updateAgent } from "../../lib/openclaw-store"
import {
  invokeWebhook,
  getSessionId,
  type OpenClawConfig,
  type WakeContext,
} from "../../lib/openclaw-gateway"

/**
 * POST /api/openclaw/chat
 *
 * Send a message to an agent via OpenClaw HTTP webhook.
 * Simple POST — no WebSocket, no method fallback cascade.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 })
  }

  const { agentId, message } = body as {
    agentId?: string
    message?: string
  }

  if (!agentId || !message) {
    return NextResponse.json({ ok: false, error: "agentId and message required" }, { status: 400 })
  }

  const agent = getAgent(agentId)
  if (!agent?.url) {
    return NextResponse.json(
      { ok: false, error: "Agent not configured. Connect via the Connect Agent page." },
      { status: 400 }
    )
  }

  const config: OpenClawConfig = {
    url: agent.url,
    webhookAuthHeader: agent.webhookAuthHeader || undefined,
    customHeaders: agent.customHeaders,
    method: agent.method,
    timeoutSec: agent.timeoutSec,
    sessionKeyStrategy: agent.sessionKeyStrategy,
    sessionKey: agent.fixedSessionKey,
    payloadTemplate: agent.payloadTemplate,
  }

  const runId = `chat_${Date.now().toString(16)}_${Math.random().toString(36).slice(2, 8)}`

  const wakeCtx: WakeContext = {
    runId,
    agentId,
    agentName: agent.name,
    wakeReason: "chat",
    prompt: message,
    sessionId: agent.sessionId ?? getSessionId(agentId),
  }

  try {
    const result = await invokeWebhook(config, wakeCtx)

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error ?? "Webhook error" }, { status: 502 })
    }

    // Update agent state
    const agentUpdate: Record<string, unknown> = {
      lastHeartbeatAt: Date.now(),
      totalRuns: agent.totalRuns + 1,
    }
    if (result.sessionId) {
      agentUpdate.sessionId = result.sessionId
    }
    updateAgent(agentId, agentUpdate)

    return NextResponse.json({
      ok: true,
      data: {
        response: result.resultText ?? "Agent accepted the message.",
        sessionId: result.sessionId,
        sync: result.sync,
        executionId: result.executionId,
        usage: result.usage,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 502 })
  }
}
