import { NextResponse } from "next/server"
import { listAvailableTools, executeMcpTool } from "../../lib/mcp-tools"
import { getActiveConnections } from "../../lib/mcp-store"
import { appendMessage, notifySubscribers } from "../../lib/bridge"

export async function GET() {
  const connections = getActiveConnections()
  const tools = listAvailableTools()

  return NextResponse.json({
    ok: true,
    data: {
      available: connections.length > 0,
      serverCount: connections.length,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        serverId: t.serverId,
        serverName: t.serverName,
        inputSchema: t.inputSchema,
      })),
    },
  })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { agent_id, tool, params, server_id } = body as {
    agent_id?: string
    tool?: string
    params?: Record<string, unknown>
    server_id?: string
  }

  if (!tool) {
    return NextResponse.json({ ok: false, error: "Missing 'tool'" }, { status: 400 })
  }
  if (!params || typeof params !== "object") {
    return NextResponse.json({ ok: false, error: "Missing 'params'" }, { status: 400 })
  }

  const connections = getActiveConnections()
  if (connections.length === 0) {
    return NextResponse.json({ ok: false, error: "No active MCP connections" }, { status: 503 })
  }

  const caller = agent_id ?? "unknown"

  // Log tool call to bridge
  const callMsg = appendMessage(caller, "mcp", "tool_call", {
    text: `${tool}(${JSON.stringify(params)})`,
    metadata: { tool, params, server_id },
  })
  notifySubscribers(callMsg)

  // Execute
  const result = await executeMcpTool(tool, params, server_id)

  // Log result to bridge
  const resultMsg = appendMessage("mcp", caller, "tool_result", {
    text: result.ok ? `${tool} completed` : `${tool} failed: ${result.error}`,
    metadata: {
      tool,
      serverId: result.serverId,
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
    serverId: result.serverId,
    call_id: callMsg.id,
  })
}
