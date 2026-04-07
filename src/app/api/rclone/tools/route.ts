import { NextResponse } from "next/server"
import { RCLONE_TOOLS, executeRcloneTool } from "../../lib/rclone-tools"
import { getActiveConnection } from "../../lib/rclone-store"
import { appendMessage, notifySubscribers } from "../../lib/bridge"
import type { RcloneToolName } from "../../lib/types"

export async function GET() {
  const connection = getActiveConnection()
  return NextResponse.json({
    ok: true,
    data: {
      available: Boolean(connection),
      connected: connection?.status === "connected",
      remotes: connection?.remotes ?? [],
      tools: connection ? RCLONE_TOOLS : [],
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { agent_id, tool, params } = body as {
    agent_id?: string; tool?: RcloneToolName; params?: Record<string, unknown>
  }

  if (!tool) return NextResponse.json({ ok: false, error: "Missing 'tool'" }, { status: 400 })
  if (!params || typeof params !== "object") return NextResponse.json({ ok: false, error: "Missing 'params'" }, { status: 400 })

  const toolDef = RCLONE_TOOLS.find((t) => t.name === tool)
  if (!toolDef) return NextResponse.json({ ok: false, error: `Unknown tool: ${tool}` }, { status: 400 })

  for (const [key, def] of Object.entries(toolDef.params)) {
    if (def.required && params[key] === undefined) {
      return NextResponse.json({ ok: false, error: `Missing required param: ${key}` }, { status: 400 })
    }
  }

  const connection = getActiveConnection()
  if (!connection) return NextResponse.json({ ok: false, error: "No active rclone connection" }, { status: 503 })

  const caller = agent_id ?? "unknown"
  const callMsg = appendMessage(caller, "rclone", "tool_call", {
    text: `${tool}(${JSON.stringify(params)})`,
    metadata: { tool, params },
  })
  notifySubscribers(callMsg)

  const result = await executeRcloneTool(tool, params)

  // Redact file contents in logs
  const safeData = result.ok && tool === "rclone.cat"
    ? { ...result.data as Record<string, unknown>, content: "[redacted]" }
    : result.data

  const resultMsg = appendMessage("rclone", caller, "tool_result", {
    text: result.ok ? `${tool} completed` : `${tool} failed: ${result.error}`,
    metadata: { tool, ok: result.ok, ...(result.ok ? { data: safeData } : { error: result.error }) },
  }, callMsg.id)
  notifySubscribers(resultMsg)

  return NextResponse.json({ ok: result.ok, data: result.data, error: result.error, tool, call_id: callMsg.id })
}
