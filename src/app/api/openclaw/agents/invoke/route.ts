import { NextResponse } from "next/server"
import { invokeAgent } from "../../../lib/openclaw-adapter"
import { getAgent } from "../../../lib/openclaw-store"
import { appendMessage, notifySubscribers } from "../../../lib/bridge"

/**
 * POST /api/openclaw/agents/invoke
 *
 * Send a prompt to an OpenClaw agent through the Gateway.
 * This is the task bridge: XO Org → Gateway → Agent.
 *
 * Body:
 *  {
 *    agentId: "aria",
 *    prompt: "Review PR #142 for security issues",
 *    fromAgent?: "nova"    // Who sent this (for bridge logging)
 *  }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const { agentId, prompt, fromAgent } = body as {
    agentId?: string
    prompt?: string
    fromAgent?: string
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
      { ok: false, error: `Agent '${agentId}' is not connected via OpenClaw` },
      { status: 404 }
    )
  }

  const caller = fromAgent ?? "org"

  // Log the invocation in the bridge
  const callMsg = appendMessage(caller, agentId, "task", {
    text: prompt,
    metadata: { via: "openclaw", sessionKey: agent.sessionKey },
  })
  notifySubscribers(callMsg)

  try {
    const result = await invokeAgent(agent.sessionKey, prompt, {
      model: agent.model,
    })

    // Log result
    const resultMsg = appendMessage(agentId, caller, "reply", {
      text: "Task received via OpenClaw Gateway",
      metadata: { via: "openclaw", result },
    }, callMsg.id)
    notifySubscribers(resultMsg)

    return NextResponse.json({
      ok: true,
      data: {
        agentId,
        sessionKey: agent.sessionKey,
        result,
        callId: callMsg.id,
      },
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    // Log failure
    appendMessage(agentId, caller, "reply", {
      text: `Invocation failed: ${errorMsg}`,
      metadata: { via: "openclaw", error: errorMsg },
    }, callMsg.id)

    return NextResponse.json(
      { ok: false, error: `Gateway invocation failed: ${errorMsg}` },
      { status: 502 }
    )
  }
}
