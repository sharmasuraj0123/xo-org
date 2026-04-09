/**
 * OpenClaw HTTP Webhook Adapter
 *
 * Implements the Paperclip adapter pattern for OpenClaw:
 *  - HTTP POST to webhook URL
 *  - Paperclip metadata nested under "paperclip" key
 *  - Bearer token or custom header auth
 *  - payloadTemplate fields merged at root level
 *  - Session continuity via sessionId
 *  - Sync (200) / async (202) response handling
 *  - "unknown_session" auto-recovery
 */

import crypto from "node:crypto"

// ─── Config Types ────────────────────────────────────────────

export interface OpenClawConfig {
  /** Webhook endpoint URL (required) */
  url: string
  /** Authorization header value, e.g. "Bearer my-token" */
  webhookAuthHeader?: string
  /** Additional custom headers, e.g. { "X-OpenClaw-API-Key": "..." } */
  customHeaders?: Record<string, string>
  /** HTTP method (default: POST) */
  method?: string
  /** Request timeout in seconds (default: 30) */
  timeoutSec?: number
  /** Custom payload fields merged at root level */
  payloadTemplate?: Record<string, unknown>
  /** Session key strategy */
  sessionKeyStrategy?: "issue" | "fixed" | "run"
  /** Fixed session key when strategy = "fixed" */
  sessionKey?: string
}

// ─── Wake / Invocation Context ───────────────────────────────

export interface WakeContext {
  runId: string
  agentId: string
  agentName?: string
  companyId?: string
  taskId?: string
  issueId?: string
  issueIds?: string[]
  wakeReason?: string
  context?: Record<string, unknown>
  sessionId?: string
  prompt?: string
}

// ─── Response Types ──────────────────────────────────────────

export interface WebhookSyncResponse {
  status: "ok" | "error"
  sessionId?: string
  result?: unknown
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
  error?: string
}

export interface WebhookAsyncResponse {
  status: "accepted"
  executionId: string
  callbackUrl?: string
}

export type WebhookResponse = WebhookSyncResponse | WebhookAsyncResponse

export interface ExecutionResult {
  ok: boolean
  sync: boolean
  sessionId?: string
  executionId?: string
  resultText?: string
  result?: unknown
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens?: number
  }
  error?: string
}

// ─── Session Cache ───────────────────────────────────────────
// Tracks sessionId per agent for continuity across invocations

const sessionCache = new Map<string, string>()

export function getSessionId(agentId: string): string | undefined {
  return sessionCache.get(agentId)
}

export function setSessionId(agentId: string, sessionId: string) {
  sessionCache.set(agentId, sessionId)
}

export function clearSessionId(agentId: string) {
  sessionCache.delete(agentId)
}

// ─── Session Key Resolution ─────────────────────────────────

export function resolveSessionKey(
  config: OpenClawConfig,
  context: { taskId?: string; issueId?: string; runId?: string }
): string {
  const strategy = config.sessionKeyStrategy ?? "issue"

  switch (strategy) {
    case "issue":
      return `paperclip:issue:${context.issueId ?? context.taskId ?? "default"}`
    case "fixed":
      return config.sessionKey ?? "paperclip"
    case "run":
      return `paperclip:run:${context.runId ?? crypto.randomUUID().slice(0, 8)}`
    default:
      return "paperclip"
  }
}

// ─── Payload Builder ─────────────────────────────────────────

/**
 * Build the webhook request payload.
 *
 * Structure:
 *  - Paperclip metadata nested under "paperclip" key
 *  - payloadTemplate fields merged at root level
 *  - prompt/message at root level
 */
export function buildWebhookPayload(
  config: OpenClawConfig,
  ctx: WakeContext
): Record<string, unknown> {
  // Paperclip metadata nested under "paperclip" key
  const paperclip: Record<string, unknown> = {
    runId: ctx.runId,
    agentId: ctx.agentId,
    companyId: ctx.companyId,
    taskId: ctx.taskId,
    wakeReason: ctx.wakeReason ?? "manual",
    issueIds: ctx.issueIds ?? (ctx.issueId ? [ctx.issueId] : []),
    context: ctx.context ?? {},
  }

  // Include sessionId for continuity
  const sessionId = ctx.sessionId ?? getSessionId(ctx.agentId)
  if (sessionId) {
    paperclip.sessionId = sessionId
  }

  // Root payload: template fields + paperclip key
  const payload: Record<string, unknown> = {}

  // Merge payloadTemplate at root level
  if (config.payloadTemplate) {
    const interpolated = interpolatePayload(config.payloadTemplate, {
      "agent.id": ctx.agentId,
      "agent.name": ctx.agentName ?? ctx.agentId,
      "run.id": ctx.runId,
      "run.source": ctx.wakeReason ?? "manual",
      "task.id": ctx.taskId ?? "",
      "prompt": ctx.prompt ?? "",
    })
    Object.assign(payload, interpolated)
  }

  // Nest paperclip metadata
  payload.paperclip = paperclip

  // Include prompt/message at root
  if (ctx.prompt) {
    payload.message = ctx.prompt
  }

  return payload
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

// ─── HTTP Webhook Invocation ─────────────────────────────────

/**
 * Invoke an OpenClaw agent via HTTP webhook.
 *
 * Handles:
 *  - 200 OK → sync result with sessionId + usage
 *  - 202 Accepted → async execution with executionId
 *  - "unknown_session" → clear session, retry once
 */
export async function invokeWebhook(
  config: OpenClawConfig,
  ctx: WakeContext,
  _isRetry = false
): Promise<ExecutionResult> {
  const url = config.url
  if (!url) throw new Error("openclaw_webhook_url_missing")

  // Validate URL
  try {
    new URL(url)
  } catch {
    throw new Error("openclaw_webhook_url_invalid")
  }

  const method = (config.method ?? "POST").toUpperCase()
  const timeoutMs = (config.timeoutSec ?? 30) * 1000
  const payload = buildWebhookPayload(config, ctx)

  // Build headers
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...config.customHeaders,
  }
  if (config.webhookAuthHeader) {
    headers["Authorization"] = config.webhookAuthHeader
  }

  console.log(`[openclaw] ${method} ${url} run=${ctx.runId} agent=${ctx.agentId}`)

  const res = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  })

  // ── Handle sync response (200 OK) ─────────────────────────
  if (res.status === 200) {
    const body = await res.json() as WebhookSyncResponse

    // Detect "unknown_session" → clear and retry
    if (body.error?.includes("unknown_session") && !_isRetry) {
      console.log(`[openclaw] unknown_session for ${ctx.agentId} — clearing and retrying`)
      clearSessionId(ctx.agentId)
      return invokeWebhook(config, { ...ctx, sessionId: undefined }, true)
    }

    if (body.status === "error") {
      return {
        ok: false,
        sync: true,
        sessionId: body.sessionId,
        error: body.error ?? "Webhook returned error status",
      }
    }

    // Store sessionId for future continuity
    if (body.sessionId) {
      setSessionId(ctx.agentId, body.sessionId)
    }

    // Extract result text
    let resultText: string | undefined
    if (typeof body.result === "string") {
      resultText = body.result
    } else if (body.result && typeof body.result === "object") {
      const r = body.result as Record<string, unknown>
      resultText = (r.text as string) ?? (r.summary as string) ?? JSON.stringify(r)
    }

    console.log(`[openclaw] 200 OK run=${ctx.runId} sessionId=${body.sessionId ?? "none"}`)

    return {
      ok: true,
      sync: true,
      sessionId: body.sessionId,
      resultText,
      result: body.result,
      usage: body.usage ? {
        inputTokens: body.usage.inputTokens ?? 0,
        outputTokens: body.usage.outputTokens ?? 0,
        totalTokens: body.usage.totalTokens,
      } : undefined,
    }
  }

  // ── Handle async response (202 Accepted) ───────────────────
  if (res.status === 202) {
    const body = await res.json() as WebhookAsyncResponse

    console.log(`[openclaw] 202 Accepted run=${ctx.runId} executionId=${body.executionId}`)

    return {
      ok: true,
      sync: false,
      executionId: body.executionId,
    }
  }

  // ── Handle errors ──────────────────────────────────────────
  const errorText = await res.text().catch(() => "")
  console.log(`[openclaw] HTTP ${res.status} run=${ctx.runId} error=${errorText.slice(0, 200)}`)

  return {
    ok: false,
    sync: true,
    error: `Webhook returned HTTP ${res.status}: ${errorText.slice(0, 500)}`,
  }
}

// ─── Probe / Test Webhook ────────────────────────────────────

export interface ProbeResult {
  status: "ok" | "auth_failed" | "failed"
  latencyMs: number
  httpStatus?: number
  error?: string
}

/**
 * Test webhook connectivity with a lightweight probe.
 * Sends a minimal payload to verify the endpoint is reachable and auth works.
 */
export async function probeWebhook(config: OpenClawConfig): Promise<ProbeResult> {
  const start = Date.now()
  const url = config.url
  if (!url) return { status: "failed", latencyMs: 0, error: "No URL configured" }

  try {
    new URL(url)
  } catch {
    return { status: "failed", latencyMs: 0, error: "Invalid URL" }
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...config.customHeaders,
    }
    if (config.webhookAuthHeader) {
      headers["Authorization"] = config.webhookAuthHeader
    }

    const probePayload = {
      paperclip: {
        runId: `probe_${Date.now()}`,
        agentId: "__probe__",
        wakeReason: "probe",
      },
    }

    const res = await fetch(url, {
      method: (config.method ?? "POST").toUpperCase(),
      headers,
      body: JSON.stringify(probePayload),
      signal: AbortSignal.timeout(5000),
    })

    const latencyMs = Date.now() - start

    if (res.status === 401 || res.status === 403) {
      return { status: "auth_failed", latencyMs, httpStatus: res.status, error: "Authentication failed" }
    }

    // Any 2xx or 4xx (except auth) means the endpoint is reachable
    if (res.status >= 200 && res.status < 500) {
      return { status: "ok", latencyMs, httpStatus: res.status }
    }

    return { status: "failed", latencyMs, httpStatus: res.status, error: `HTTP ${res.status}` }
  } catch (err) {
    return {
      status: "failed",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── HTTP Gateway Helper (for sessions/history) ─────────────

/**
 * Invoke a gateway tool via HTTP POST /tools/invoke.
 * Used for session operations (list, history) which still use the gateway HTTP API.
 */
export async function gatewayToolInvoke(
  gatewayUrl: string,
  gatewayToken: string,
  tool: string,
  args: Record<string, unknown> = {},
  timeoutMs = 10_000
): Promise<unknown> {
  const res = await fetch(`${gatewayUrl}/tools/invoke`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${gatewayToken}`,
      "x-openclaw-token": gatewayToken,
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
