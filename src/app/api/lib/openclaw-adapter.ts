/**
 * OpenClaw Gateway adapter.
 *
 * Bridges XO Org agents ↔ OpenClaw Gateway, enabling:
 *  - Registering OpenClaw agents in the XO Org bridge
 *  - Invoking agents through the Gateway (send prompts, assign tasks)
 *  - Listing live sessions and fetching results
 *
 * The Gateway exposes HTTP at /tools/invoke with Bearer auth.
 */

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789"
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "xo"

// ─── Configuration Check ─────────────────────────────────────

export function isOpenClawConfigured(): boolean {
  return Boolean(GATEWAY_URL)
}

export function getGatewayUrl(): string {
  return GATEWAY_URL
}

// ─── Gateway HTTP Helper ─────────────────────────────────────

async function gatewayInvoke(
  tool: string,
  args: Record<string, unknown> = {},
  timeoutMs = 10_000
): Promise<unknown> {
  const res = await fetch(`${GATEWAY_URL}/tools/invoke`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GATEWAY_TOKEN}`,
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
  contextTokens: number
  model: string
  modelProvider: string
}

export async function listGatewaySessions(): Promise<GatewaySession[]> {
  const result = (await gatewayInvoke("sessions_list")) as {
    details?: { sessions: GatewaySession[]; count: number }
  }
  return result?.details?.sessions ?? []
}

export async function getSessionHistory(
  sessionKey: string,
  limit = 100
): Promise<unknown> {
  return gatewayInvoke("sessions_history", { sessionKey, limit })
}

// ─── Agent Invocation ────────────────────────────────────────

/**
 * Send a prompt/task to an agent through the OpenClaw Gateway.
 *
 * This is the key bridge: XO Org task → Gateway → Agent runtime.
 */
export async function invokeAgent(
  sessionKey: string,
  prompt: string,
  options: {
    model?: string
    maxTokens?: number
    metadata?: Record<string, unknown>
  } = {}
): Promise<unknown> {
  return gatewayInvoke(
    "sessions_send",
    {
      sessionKey,
      message: prompt,
      ...options,
    },
    60_000 // Longer timeout for agent invocations
  )
}

/**
 * Check if the Gateway is reachable and responding.
 */
export async function pingGateway(): Promise<{
  ok: boolean
  url: string
  latencyMs: number
}> {
  const start = Date.now()
  try {
    await listGatewaySessions()
    return { ok: true, url: GATEWAY_URL, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, url: GATEWAY_URL, latencyMs: Date.now() - start }
  }
}
