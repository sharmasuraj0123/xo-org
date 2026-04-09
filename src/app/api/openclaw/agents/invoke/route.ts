import { NextResponse } from "next/server"
import {
  invokeWebhook,
  resolveSessionKey,
  getSessionId,
  type OpenClawConfig,
  type WakeContext,
} from "../../../lib/openclaw-gateway"
import { getAgent, updateAgent } from "../../../lib/openclaw-store"
import { appendMessage, notifySubscribers } from "../../../lib/bridge"

/**
 * POST /api/openclaw/agents/invoke
 *
 * Execute an OpenClaw agent via HTTP webhook:
 *  1. Validate agent is connected
 *  2. Build webhook config + wake context
 *  3. POST to webhook URL with Paperclip payload
 *  4. Handle sync (200) or async (202) response
 *  5. Track session, usage, and run count
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

  // Build webhook config from stored agent
  const webhookConfig: OpenClawConfig = {
    url: agent.url,
    webhookAuthHeader: agent.webhookAuthHeader || undefined,
    customHeaders: agent.customHeaders,
    method: agent.method,
    timeoutSec: agent.timeoutSec,
    sessionKeyStrategy: agent.sessionKeyStrategy,
    sessionKey: agent.fixedSessionKey,
    payloadTemplate: agent.payloadTemplate,
  }

  // Build wake context
  const wakeCtx: WakeContext = {
    runId,
    agentId,
    agentName: agent.name,
    taskId,
    issueId,
    wakeReason: runSource ?? "manual",
    prompt,
    sessionId: agent.sessionId ?? getSessionId(agentId),
  }

  // Log invocation in bridge
  const callMsg = appendMessage(caller, agentId, "task", {
    text: prompt,
    metadata: {
      via: "openclaw_webhook",
      runId,
      runSource: runSource ?? "manual",
      sessionKey: resolveSessionKey(webhookConfig, { taskId, issueId, runId }),
    },
  })
  notifySubscribers(callMsg)

  try {
    const result = await invokeWebhook(webhookConfig, wakeCtx)

    // Update agent state
    const agentUpdate: Record<string, unknown> = {
      lastHeartbeatAt: Date.now(),
      totalRuns: agent.totalRuns + 1,
    }
    if (result.sessionId) {
      agentUpdate.sessionId = result.sessionId
    }
    updateAgent(agentId, agentUpdate)

    // Log result in bridge
    const resultText = result.resultText ?? (result.error ? `Failed: ${result.error}` : "Completed")
    const resultMsg = appendMessage(agentId, caller, "reply", {
      text: resultText,
      metadata: {
        via: "openclaw_webhook",
        runId,
        sync: result.sync,
        sessionId: result.sessionId,
        executionId: result.executionId,
        usage: result.usage,
      },
    }, callMsg.id)
    notifySubscribers(resultMsg)

    return NextResponse.json({
      ok: result.ok,
      data: {
        agentId,
        runId,
        sync: result.sync,
        sessionId: result.sessionId,
        executionId: result.executionId,
        resultText: result.resultText,
        usage: result.usage,
        callId: callMsg.id,
      },
      error: result.error,
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    appendMessage(agentId, caller, "reply", {
      text: `Execution failed: ${errorMsg}`,
      metadata: { via: "openclaw_webhook", runId, error: errorMsg },
    }, callMsg.id)

    return NextResponse.json({ ok: false, error: errorMsg, runId }, { status: 502 })
  }
}
