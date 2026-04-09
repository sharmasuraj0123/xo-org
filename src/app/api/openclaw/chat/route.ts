import { NextResponse } from "next/server"
import { getAgent, updateAgent } from "../../lib/openclaw-store"
import {
  executeAgent,
  type GatewayConfig, type WakeContext,
} from "../../lib/openclaw-gateway"

/**
 * POST /api/openclaw/chat
 *
 * Send a message to an agent via the Paperclip adapter pattern:
 * WebSocket V3 → agent request → stream events → agent.wait → result
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

  try {
    const result = await executeAgent(gatewayConfig, wakeCtx)

    updateAgent(agentId, {
      lastHeartbeatAt: Date.now(),
      totalRuns: agent.totalRuns + 1,
    })

    const responseText = result.resultText ?? result.error ?? "No response from agent."

    return NextResponse.json({ ok: true, data: { response: responseText } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 502 })
  }
}
