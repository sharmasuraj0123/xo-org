import { NextResponse } from "next/server"
import { mcpInitialize, mcpListTools } from "../../lib/mcp"
import { saveConnection } from "../../lib/mcp-store"
import type { McpServerConfig } from "../../lib/types"

/**
 * POST /api/mcp/connect
 * Connect to an MCP server. Supports HTTP and stdio transports.
 *
 * Body:
 *  { name, transport: "http", url, apiKey? }
 *  { name, transport: "stdio", command, args? }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const { name, transport, url, apiKey, command, args } = body as {
    name?: string
    transport?: string
    url?: string
    apiKey?: string
    command?: string
    args?: string[]
  }

  if (!transport || !["http", "stdio"].includes(transport)) {
    return NextResponse.json(
      { ok: false, error: "transport must be 'http' or 'stdio'" },
      { status: 400 }
    )
  }

  if (transport === "http" && !url) {
    return NextResponse.json({ ok: false, error: "HTTP transport requires 'url'" }, { status: 400 })
  }

  if (transport === "stdio" && !command) {
    return NextResponse.json({ ok: false, error: "Stdio transport requires 'command'" }, { status: 400 })
  }

  const config: McpServerConfig = {
    id: crypto.randomUUID().slice(0, 8),
    name: (name as string) || url || command || "MCP Server",
    transport: transport as "http" | "stdio",
    url: url || undefined,
    apiKey: apiKey || undefined,
    command: command || undefined,
    args: args || undefined,
  }

  try {
    // Initialize MCP session
    const initResult = await mcpInitialize(config)

    // Discover tools
    const tools = await mcpListTools(config)

    // Store connection
    const connection = saveConnection(
      config,
      initResult.serverName,
      initResult.serverVersion,
      initResult.protocolVersion,
      tools
    )

    return NextResponse.json({
      ok: true,
      data: {
        id: connection.id,
        serverName: connection.serverName,
        serverVersion: connection.serverVersion,
        protocolVersion: connection.protocolVersion,
        transport: config.transport,
        toolCount: tools.length,
        tools: tools.map((t) => ({ name: t.name, description: t.description })),
        status: connection.status,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isNotFound = message.includes("ENOENT") || message.includes("not found")
    const isNetwork = message.includes("fetch") || message.includes("ECONNREFUSED")

    return NextResponse.json(
      {
        ok: false,
        error: isNotFound
          ? `Command not found: ${command}. Make sure it's installed and in PATH.`
          : isNetwork
            ? `Cannot reach MCP server at ${url}. Check the URL and ensure the server is running.`
            : `Failed to connect: ${message}`,
      },
      { status: isNotFound ? 404 : 502 }
    )
  }
}
