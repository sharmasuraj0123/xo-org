import { NextResponse } from "next/server"
import {
  executeAgent, resolveSessionKey,
  type GatewayConfig, type WakeContext, type AgentEvent,
} from "../../../lib/openclaw-gateway"
import { getAgent, updateAgent } from "../../../lib/openclaw-store"
import { appendMessage, notifySubscribers } from "../../../lib/bridge"

/**
 * POST /api/openclaw/agents/invoke
 *
 * Execute the full 9-step OpenClaw Gateway V3 pipeline:
 *  1. Validate config
 *  2. Build payloads (wakePayload, paperclipEnv, wakeText, agentParams)
 *  3. Resolve device identity (ED25519)
 *  4. WebSocket connection + challenge handshake
 *  5. Send agent request
 *  6. Stream agent events (real-time)
 *  7. Wait for completion (agent.wait)
 *  8. Assemble result (priority chain)
 *  9. Cleanup (close WebSocket)
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const { agentId, prompt, fromAgent, taskId, issueId, runSource } = body as {
    agentId?: string
    prompt?: string
    fromAgent?: string
    taskId?: string
    issueId?: string
    runSource?: string
  }

  if (!agentId) return NextResponse.json({ ok: false, error: "agentId is required" }, { status: 400 })
  if (!prompt) return NextResponse.json({ ok: false, error: "prompt is required" }, { status: 400 })

  const agent = getAgent(agentId)
  if (!agent || agent.status !== "connected") {
    return NextResponse.json({ ok: false, error: `Agent '${agentId}' is not connected` }, { status: 404 })
  }

  const runId = `run_${Date.now().toString(16)}_${Math.random().toString(36).slice(2, 8)}`
  const caller = fromAgent ?? "org"

  // Build Gateway config from stored agent
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

  // Build wake context (Step 2 from deep dive)
  const wakeCtx: WakeContext = {
    runId,
    agentId,
    agentName: agent.name,
    taskId,
    issueId,
    wakeReason: runSource ?? "manual",
    promptTemplate: prompt,
  }

  // Log invocation in bridge
  const callMsg = appendMessage(caller, agentId, "task", {
    text: prompt,
    metadata: {
      via: "openclaw_gateway_ws_v3",
      runId,
      runSource: runSource ?? "manual",
      sessionKey: resolveSessionKey(gatewayConfig, { taskId, issueId, runId }),
    },
  })
  notifySubscribers(callMsg)

  // Collect logs for bridge
  const logs: string[] = []

  try {
    // Execute the full 9-step pipeline
    const result = await executeAgent(
      gatewayConfig,
      wakeCtx,
      (event: AgentEvent) => {
        // Real-time event callback — could push via SSE
        if (event.stream === "assistant" && event.data.delta) {
          // Future: stream to dashboard
        }
      },
      (stream, chunk) => {
        logs.push(`[${stream}] ${chunk}`)
      }
    )

    // Update agent state
    updateAgent(agentId, {
      lastHeartbeatAt: Date.now(),
      totalRuns: agent.totalRuns + 1,
    })

    // Log result in bridge
    const resultText = result.resultText ?? (result.error ? `Failed: ${result.error}` : "Completed")
    const resultMsg = appendMessage(agentId, caller, "reply", {
      text: resultText,
      metadata: {
        via: "openclaw_gateway_ws_v3",
        runId,
        exitCode: result.exitCode,
        signal: result.signal,
        timedOut: result.timedOut,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        costUsd: result.costUsd,
        summary: result.summary,
        eventCount: result.events.length,
        runtimeServices: result.runtimeServices,
      },
    }, callMsg.id)
    notifySubscribers(resultMsg)

    return NextResponse.json({
      ok: result.exitCode === 0,
      data: {
        agentId,
        runId,
        exitCode: result.exitCode,
        signal: result.signal,
        timedOut: result.timedOut,
        provider: result.provider,
        model: result.model,
        usage: result.usage,
        costUsd: result.costUsd,
        resultText: result.resultText,
        summary: result.summary,
        eventCount: result.events.length,
        callId: callMsg.id,
      },
      error: result.error,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    appendMessage(agentId, caller, "reply", {
      text: `Execution failed: ${errorMsg}`,
      metadata: { via: "openclaw_gateway_ws_v3", runId, error: errorMsg },
    }, callMsg.id)

    return NextResponse.json({ ok: false, error: errorMsg, runId }, { status: 502 })
  }
}
