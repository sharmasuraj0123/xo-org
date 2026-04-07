import { NextResponse } from "next/server"
import { SLACK_TOOLS, executeSlackTool } from "../../lib/slack-tools"
import { isSlackConfigured } from "../../lib/slack"
import { getActiveConnection } from "../../lib/slack-store"
import { appendMessage, notifySubscribers } from "../../lib/bridge"
import type { SlackToolName } from "../../lib/types"

/**
 * GET /api/slack/tools — Tool discovery
 */
export async function GET() {
  if (!isSlackConfigured()) {
    return NextResponse.json({
      ok: true,
      data: { available: false, tools: [], reason: "Slack not configured" },
    })
  }

  const connection = getActiveConnection()

  return NextResponse.json({
    ok: true,
    data: {
      available: Boolean(connection),
      connected: connection?.status === "connected",
      teamName: connection?.teamName ?? null,
      tools: connection ? SLACK_TOOLS : [],
    },
  })
}

/**
 * POST /api/slack/tools — Execute a Slack tool
 */
export async function POST(req: Request) {
  const body = await req.json()
  const { agent_id, tool, params } = body as {
    agent_id?: string
    tool?: SlackToolName
    params?: Record<string, unknown>
  }

  if (!tool) {
    return NextResponse.json(
      { ok: false, error: "Missing 'tool' field" },
      { status: 400 }
    )
  }

  if (!params || typeof params !== "object") {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid 'params' field" },
      { status: 400 }
    )
  }

  const toolDef = SLACK_TOOLS.find((t) => t.name === tool)
  if (!toolDef) {
    return NextResponse.json(
      { ok: false, error: `Unknown tool: ${tool}` },
      { status: 400 }
    )
  }

  for (const [key, def] of Object.entries(toolDef.params)) {
    if (def.required && (params[key] === undefined || params[key] === null)) {
      return NextResponse.json(
        { ok: false, error: `Missing required param: ${key}` },
        { status: 400 }
      )
    }
  }

  const connection = getActiveConnection()
  if (!connection) {
    return NextResponse.json(
      { ok: false, error: "No active Slack connection" },
      { status: 503 }
    )
  }

  const caller = agent_id ?? "unknown"

  // Log tool call in bridge
  const callMsg = appendMessage(caller, "slack", "tool_call", {
    text: `${tool}(${JSON.stringify(params)})`,
    metadata: { tool, params },
  })
  notifySubscribers(callMsg)

  const result = await executeSlackTool(tool, params)

  const resultMsg = appendMessage("slack", caller, "tool_result", {
    text: result.ok
      ? `${tool} completed`
      : `${tool} failed: ${result.error}`,
    metadata: {
      tool,
      ok: result.ok,
      ...(result.ok ? { data: result.data } : { error: result.error }),
    },
  }, callMsg.id)
  notifySubscribers(resultMsg)

  return NextResponse.json({
    ok: result.ok,
    data: result.data,
    error: result.error,
    tool,
    call_id: callMsg.id,
  })
}
