import { NextResponse } from "next/server"
import { VERCEL_TOOLS, executeVercelTool } from "../../lib/vercel-tools"
import { isVercelConfigured } from "../../lib/vercel"
import { getActiveConnection } from "../../lib/vercel-store"
import { appendMessage, notifySubscribers } from "../../lib/bridge"
import type { VercelToolName } from "../../lib/types"

export async function GET() {
  if (!isVercelConfigured()) {
    return NextResponse.json({ ok: true, data: { available: false, tools: [] } })
  }
  const connection = getActiveConnection()
  return NextResponse.json({
    ok: true,
    data: {
      available: Boolean(connection),
      connected: connection?.status === "connected",
      username: connection?.username ?? null,
      teamId: connection?.teamId ?? null,
      tools: connection ? VERCEL_TOOLS : [],
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { agent_id, tool, params } = body as {
    agent_id?: string; tool?: VercelToolName; params?: Record<string, unknown>
  }

  if (!tool) return NextResponse.json({ ok: false, error: "Missing 'tool'" }, { status: 400 })
  if (!params || typeof params !== "object") return NextResponse.json({ ok: false, error: "Missing 'params'" }, { status: 400 })

  const toolDef = VERCEL_TOOLS.find((t) => t.name === tool)
  if (!toolDef) return NextResponse.json({ ok: false, error: `Unknown tool: ${tool}` }, { status: 400 })

  for (const [key, def] of Object.entries(toolDef.params)) {
    if (def.required && params[key] === undefined) {
      return NextResponse.json({ ok: false, error: `Missing required param: ${key}` }, { status: 400 })
    }
  }

  const connection = getActiveConnection()
  if (!connection) return NextResponse.json({ ok: false, error: "No active Vercel connection" }, { status: 503 })

  const caller = agent_id ?? "unknown"
  const callMsg = appendMessage(caller, "vercel", "tool_call", {
    text: `${tool}(${JSON.stringify(params)})`,
    metadata: { tool, params },
  })
  notifySubscribers(callMsg)

  const result = await executeVercelTool(tool, params)

  const resultMsg = appendMessage("vercel", caller, "tool_result", {
    text: result.ok ? `${tool} completed` : `${tool} failed: ${result.error}`,
    metadata: { tool, ok: result.ok, ...(result.ok ? { data: result.data } : { error: result.error }) },
  }, callMsg.id)
  notifySubscribers(resultMsg)

  return NextResponse.json({ ok: result.ok, data: result.data, error: result.error, tool, call_id: callMsg.id })
}
