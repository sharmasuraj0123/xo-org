import { NextResponse } from "next/server"
import { GITHUB_TOOLS, executeGitHubTool } from "../../lib/github-tools"
import { isGitHubConfigured } from "../../lib/github"
import { getActiveInstallation } from "../../lib/github-store"
import { appendMessage, notifySubscribers } from "../../lib/bridge"
import type { GitHubToolName } from "../../lib/types"

/**
 * GET /api/github/tools
 *
 * Returns the list of available GitHub tools that agents can call.
 * This is the tool discovery endpoint — agents call this on connect
 * to know what GitHub operations are available.
 */
export async function GET() {
  if (!isGitHubConfigured()) {
    return NextResponse.json({
      ok: true,
      data: { available: false, tools: [], reason: "GitHub App not configured" },
    })
  }

  const installation = getActiveInstallation()

  return NextResponse.json({
    ok: true,
    data: {
      available: Boolean(installation),
      connected: installation?.status === "connected",
      github_username: installation?.githubUsername ?? null,
      tools: installation ? GITHUB_TOOLS : [],
    },
  })
}

/**
 * POST /api/github/tools
 *
 * Execute a GitHub tool on behalf of an agent.
 *
 * Body: { agent_id: string, tool: GitHubToolName, params: Record<string, unknown> }
 *
 * The result is returned directly AND logged to the bridge as a
 * tool_call + tool_result message pair for audit.
 */
export async function POST(req: Request) {
  const body = await req.json()
  const { agent_id, tool, params } = body as {
    agent_id?: string
    tool?: GitHubToolName
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
  const toolDef = GITHUB_TOOLS.find((t) => t.name === tool)
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

  // Check GitHub connection
  const installation = getActiveInstallation()
  if (!installation) {
    return NextResponse.json(
      { ok: false, error: "No active GitHub connection" },
      { status: 503 }
    )
  }

  const caller = agent_id ?? "unknown"

  // Log the tool call in the bridge
  const callMsg = appendMessage(caller, "github", "tool_call", {
    text: `${tool}(${JSON.stringify(params)})`,
    metadata: { tool, params },
  })
  notifySubscribers(callMsg)

  // Execute the tool
  const result = await executeGitHubTool(tool, params)

  // Log the result in the bridge
  const resultMsg = appendMessage("github", caller, "tool_result", {
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

  // Return the result to the agent
  return NextResponse.json({
    ok: result.ok,
    data: result.data,
    error: result.error,
    tool,
    call_id: callMsg.id,
  })
}
