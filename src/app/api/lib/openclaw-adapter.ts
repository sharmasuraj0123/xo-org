/**
 * OpenClaw Gateway adapter.
 *
 * Matches the Paperclip adapter pattern:
 *  - Each agent has its own Gateway URL + token
 *  - Invocation via POST /tools/invoke with sessions_send
 *  - Payload template interpolated with context vars
 *  - Fire-and-forget async delivery (no blocking wait)
 *  - Results polled later via sessions_history
 */

// ─── Fallback Config ─────────────────────────────────────────

const DEFAULT_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789"
const DEFAULT_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ""

// ─── Gateway HTTP Helper ─────────────────────────────────────

async function gatewayInvoke(
  gatewayUrl: string,
  gatewayToken: string,
  tool: string,
  args: Record<string, unknown> = {},
  timeoutMs = 10_000
): Promise<unknown> {
  const res = await fetch(`${gatewayUrl}/tools/invoke`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gatewayToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tool, args }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!res.ok) {
    throw new Error(`Gateway HTTP ${res.status}: ${await res.text()}`)
  }

  const body = (await res.json()) as {
    ok: boolean
    result?: unknown
    error?: string
  }

  if (!body.ok) {
    throw new Error(`Gateway error: ${body.error ?? "Unknown"}`)
  }

  return body.result
}

// ─── Payload Template Interpolation ──────────────────────────

/**
 * Interpolate {{variable}} placeholders in a payload template.
 *
 * Supported variables:
 *   {{agent.id}}, {{agent.name}}, {{agent.role}}, {{agent.model}}
 *   {{run.id}}, {{run.source}}
 *   {{task.id}}, {{task.title}}, {{task.description}}
 *   {{prompt}}
 */
export function interpolatePayload(
  template: Record<string, unknown>,
  context: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(template)) {
    if (typeof value === "string") {
      result[key] = value.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
        return context[path] ?? `{{${path}}}`
      })
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = interpolatePayload(value as Record<string, unknown>, context)
    } else {
      result[key] = value
    }
  }
  return result
}

// ─── Test Environment ────────────────────────────────────────

export interface EnvironmentTestResult {
  status: "pass" | "warn" | "fail"
  gatewayUrl: string
  latencyMs: number
  checks: Array<{
    code: string
    level: "info" | "warn" | "error"
    message: string
  }>
}

export async function testEnvironment(
  gatewayUrl?: string,
  gatewayToken?: string
): Promise<EnvironmentTestResult> {
  const url = gatewayUrl || DEFAULT_GATEWAY_URL
  const token = gatewayToken || DEFAULT_GATEWAY_TOKEN
  const checks: EnvironmentTestResult["checks"] = []
  const start = Date.now()

  // Check 1: Gateway reachable
  try {
    const result = (await gatewayInvoke(url, token, "sessions_list", {}, 5000)) as {
      details?: { sessions: unknown[]; count: number }
    }
    const count = result?.details?.count ?? 0
    checks.push({
      code: "gateway_reachable",
      level: "info",
      message: `Gateway reachable at ${url}`,
    })
    checks.push({
      code: "sessions_available",
      level: count > 0 ? "info" : "warn",
      message: count > 0
        ? `${count} active session${count !== 1 ? "s" : ""} found`
        : "No active sessions — start an agent in OpenClaw first",
    })
  } catch (err) {
    checks.push({
      code: "gateway_reachable",
      level: "error",
      message: `Cannot reach Gateway at ${url}: ${err instanceof Error ? err.message : String(err)}`,
    })
    return { status: "fail", gatewayUrl: url, latencyMs: Date.now() - start, checks }
  }

  const hasErrors = checks.some((c) => c.level === "error")
  const hasWarnings = checks.some((c) => c.level === "warn")

  return {
    status: hasErrors ? "fail" : hasWarnings ? "warn" : "pass",
    gatewayUrl: url,
    latencyMs: Date.now() - start,
    checks,
  }
}

// ─── Agent Invocation ────────────────────────────────────────

/**
 * Send a prompt to an agent via sessions_send.
 * Fire-and-forget — does not wait for agent response.
 */
export async function invokeAgent(
  gatewayUrl: string,
  gatewayToken: string,
  sessionKey: string,
  message: string,
  options: {
    model?: string
    metadata?: Record<string, unknown>
  } = {}
): Promise<unknown> {
  return gatewayInvoke(
    gatewayUrl,
    gatewayToken,
    "sessions_send",
    {
      sessionKey,
      message,
      ...options,
    },
    60_000
  )
}

// ─── Session Operations ──────────────────────────────────────

export interface GatewaySession {
  key: string
  kind: string
  chatType: string
  sessionId: string
  updatedAt: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  model: string
  modelProvider: string
}

export async function listSessions(
  gatewayUrl?: string,
  gatewayToken?: string
): Promise<GatewaySession[]> {
  const url = gatewayUrl || DEFAULT_GATEWAY_URL
  const token = gatewayToken || DEFAULT_GATEWAY_TOKEN
  const result = (await gatewayInvoke(url, token, "sessions_list")) as {
    details?: { sessions: GatewaySession[]; count: number }
  }
  return result?.details?.sessions ?? []
}

export async function getSessionHistory(
  sessionKey: string,
  limit = 100,
  gatewayUrl?: string,
  gatewayToken?: string
): Promise<unknown> {
  const url = gatewayUrl || DEFAULT_GATEWAY_URL
  const token = gatewayToken || DEFAULT_GATEWAY_TOKEN
  return gatewayInvoke(url, token, "sessions_history", { sessionKey, limit })
}
