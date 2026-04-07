import { NextResponse } from "next/server"
import { GMAIL_TOOLS, executeGmailTool } from "../../lib/gmail-tools"
import { isGmailConfigured } from "../../lib/gmail"
import { getActiveConnection } from "../../lib/gmail-store"
import { appendMessage, notifySubscribers } from "../../lib/bridge"
import type { GmailToolName } from "../../lib/types"

/**
 * GET /api/gmail/tools
 *
 * Returns the list of available Gmail tools for agent discovery.
 */
export async function GET() {
  if (!isGmailConfigured()) {
    return NextResponse.json({
      ok: true,
      data: { available: false, tools: [], reason: "Gmail not configured" },
    })
  }

  const connection = getActiveConnection()

  return NextResponse.json({
    ok: true,
    data: {
      available: Boolean(connection),
      connected: connection?.status === "connected",
      email: connection?.email ?? null,
      tools: connection ? GMAIL_TOOLS : [],
    },
  })
}

/**
 * POST /api/gmail/tools
 *
 * Execute a Gmail tool on behalf of an agent.
 *
 * Body: { agent_id: string, tool: GmailToolName, params: Record<string, unknown> }
 */
export async function POST(req: Request) {
  const body = await req.json()
  const { agent_id, tool, params } = body as {
    agent_id?: string
    tool?: GmailToolName
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

  // Validate tool name
  const toolDef = GMAIL_TOOLS.find((t) => t.name === tool)
  if (!toolDef) {
    return NextResponse.json(
      { ok: false, error: `Unknown tool: ${tool}` },
      { status: 400 }
    )
  }

  // Validate required params
  for (const [key, def] of Object.entries(toolDef.params)) {
    if (def.required && (params[key] === undefined || params[key] === null)) {
      return NextResponse.json(
        { ok: false, error: `Missing required param: ${key}` },
        { status: 400 }
      )
    }
  }

  // Check connection
  const connection = getActiveConnection()
  if (!connection) {
    return NextResponse.json(
      { ok: false, error: "No active Gmail connection" },
      { status: 503 }
    )
  }

  const caller = agent_id ?? "unknown"

  // Log the tool call in the bridge (redact email body for privacy)
  const safeParams = { ...params }
  if (tool === "gmail.messages.send" || tool === "gmail.drafts.create") {
    safeParams.body = "[redacted]"
  }

  const callMsg = appendMessage(caller, "gmail", "tool_call", {
    text: `${tool}(${JSON.stringify(safeParams)})`,
    metadata: { tool, params: safeParams },
  })
  notifySubscribers(callMsg)

  // Execute the tool
  const result = await executeGmailTool(tool, params)

  // Log the result (redact email body content)
  const safeData =
    result.ok && (tool === "gmail.messages.get" || tool === "gmail.threads.get")
      ? { ...(result.data as Record<string, unknown>), body: "[redacted]" }
      : result.data

  const resultMsg = appendMessage("gmail", caller, "tool_result", {
    text: result.ok
      ? `${tool} completed`
      : `${tool} failed: ${result.error}`,
    metadata: {
      tool,
      ok: result.ok,
      ...(result.ok ? { data: safeData } : { error: result.error }),
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
