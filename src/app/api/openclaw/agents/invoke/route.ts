import { NextResponse } from "next/server"
import { invokeAgent, interpolatePayload } from "../../../lib/openclaw-adapter"
import { getAgent, updateAgent } from "../../../lib/openclaw-store"
import { appendMessage, notifySubscribers } from "../../../lib/bridge"

/**
 * POST /api/openclaw/agents/invoke
 *
 * Send a prompt to an OpenClaw agent through its Gateway.
 * Uses the Paperclip pattern: payload template interpolation + sessions_send.
 * Fire-and-forget — does not wait for agent response.
 *
 * Body:
 *  {
 *    agentId: "aria",
 *    prompt: "Review PR #142 for security issues",
 *    fromAgent?: "nova",
 *    taskId?: "t_abc",
 *    taskTitle?: "Review PR #142",
 *    runSource?: "assignment" | "timer"
 *  }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const { agentId, prompt, fromAgent, taskId, taskTitle, runSource } = body as {
    agentId?: string
    prompt?: string
    fromAgent?: string
    taskId?: string
    taskTitle?: string
    runSource?: string
  }

  if (!agentId) {
    return NextResponse.json({ ok: false, error: "agentId is required" }, { status: 400 })
  }
  if (!prompt) {
    return NextResponse.json({ ok: false, error: "prompt is required" }, { status: 400 })
  }

  const agent = getAgent(agentId)
  if (!agent || agent.status !== "connected") {
    return NextResponse.json(
      { ok: false, error: `Agent '${agentId}' is not connected` },
      { status: 404 }
    )
  }

  // Build run context for payload template interpolation
  const runId = `run_${Date.now().toString(16)}_${Math.random().toString(36).slice(2, 8)}`
  const templateContext: Record<string, string> = {
    "agent.id": agent.agentId,
    "agent.name": agent.name,
    "agent.role": agent.role,
    "agent.model": agent.model,
    "run.id": runId,
    "run.source": runSource ?? "manual",
    "task.id": taskId ?? "",
    "task.title": taskTitle ?? "",
    "prompt": prompt,
  }

  // Interpolate payload template
  const interpolatedPayload = interpolatePayload(agent.payloadTemplate, templateContext)

  const caller = fromAgent ?? "org"

  // Log the invocation in the bridge
  const callMsg = appendMessage(caller, agentId, "task", {
    text: prompt,
    metadata: {
      via: "openclaw_gateway",
      runId,
      runSource: runSource ?? "manual",
      gatewayUrl: agent.gatewayUrl,
      payload: interpolatedPayload,
    },
  })
  notifySubscribers(callMsg)

  try {
    // Determine sessionKey from payload template or use agentId
    const sessionKey = (interpolatedPayload.sessionKey as string)
      ?? (interpolatedPayload.agentId as string)
      ?? agent.agentId

    const result = await invokeAgent(
      agent.gatewayUrl,
      agent.gatewayToken,
      sessionKey,
      prompt,
      { model: agent.model, metadata: interpolatedPayload }
    )

    // Update agent state
    updateAgent(agentId, {
      lastHeartbeatAt: Date.now(),
      totalRuns: agent.totalRuns + 1,
    })

    // Log result (fire-and-forget acknowledgment)
    const resultMsg = appendMessage(agentId, caller, "reply", {
      text: "Task delivered to OpenClaw Gateway",
      metadata: { via: "openclaw_gateway", runId, result },
    }, callMsg.id)
    notifySubscribers(resultMsg)

    return NextResponse.json({
      ok: true,
      data: {
        agentId,
        runId,
        gatewayUrl: agent.gatewayUrl,
        delivered: true,
        result,
        callId: callMsg.id,
      },
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    appendMessage(agentId, caller, "reply", {
      text: `Invocation failed: ${errorMsg}`,
      metadata: { via: "openclaw_gateway", runId, error: errorMsg },
    }, callMsg.id)

    return NextResponse.json(
      { ok: false, error: `Gateway invocation failed: ${errorMsg}`, runId },
      { status: 502 }
    )
  }
}
