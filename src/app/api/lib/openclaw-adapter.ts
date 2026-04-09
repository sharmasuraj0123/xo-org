/**
 * OpenClaw HTTP adapter — helper functions for session operations.
 *
 * Matches the Paperclip adapter pattern:
 *  - Each agent has its own webhook URL + auth
 *  - Session operations via Gateway HTTP /tools/invoke
 *  - Payload template interpolated with context vars
 *  - Test environment via webhook probe
 */

import {
  gatewayToolInvoke,
  probeWebhook,
  interpolatePayload,
  type OpenClawConfig,
  type ProbeResult,
} from "./openclaw-gateway"

// Re-export for backward compatibility
export { interpolatePayload }
export type { ProbeResult }

// ─── Fallback Config ─────────────────────────────────────────

const DEFAULT_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || ""
const DEFAULT_GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ""

// ─── Test Environment ────────────────────────────────────────

export interface EnvironmentTestResult {
  status: "pass" | "warn" | "fail"
  webhookUrl: string
  latencyMs: number
  checks: Array<{
    code: string
    level: "info" | "warn" | "error"
    message: string
  }>
}

export async function testEnvironment(
  config: OpenClawConfig
): Promise<EnvironmentTestResult> {
  const url = config.url
  const checks: EnvironmentTestResult["checks"] = []

  if (!url) {
    checks.push({ code: "url_missing", level: "error", message: "No webhook URL configured" })
    return { status: "fail", webhookUrl: "", latencyMs: 0, checks }
  }

  // URL format validation
  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      checks.push({ code: "url_protocol", level: "error", message: `URL must use http:// or https:// (got ${parsed.protocol})` })
      return { status: "fail", webhookUrl: url, latencyMs: 0, checks }
    }
    if (parsed.protocol === "http:" && !["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname)) {
      checks.push({ code: "url_insecure", level: "warn", message: `Using http:// to non-localhost (${parsed.hostname}) — consider https://` })
    }
  } catch {
    checks.push({ code: "url_invalid", level: "error", message: `Cannot parse URL: ${url}` })
    return { status: "fail", webhookUrl: url, latencyMs: 0, checks }
  }

  if (!config.webhookAuthHeader) {
    checks.push({ code: "auth_missing", level: "warn", message: "No authorization header configured — requests may be rejected" })
  }

  // Probe the webhook endpoint
  const probe = await probeWebhook(config)

  if (probe.status === "ok") {
    checks.push({ code: "webhook_reachable", level: "info", message: `Webhook reachable at ${url}` })
    checks.push({ code: "webhook_latency", level: "info", message: `Round-trip: ${probe.latencyMs}ms` })
  } else if (probe.status === "auth_failed") {
    checks.push({ code: "webhook_reachable", level: "info", message: `Webhook reachable at ${url}` })
    checks.push({ code: "webhook_auth", level: "error", message: `Authentication failed (HTTP ${probe.httpStatus})` })
  } else {
    checks.push({ code: "webhook_reachable", level: "error", message: probe.error ?? `Cannot reach webhook at ${url}` })
  }

  const hasErrors = checks.some((c) => c.level === "error")
  const hasWarnings = checks.some((c) => c.level === "warn")

  return {
    status: hasErrors ? "fail" : hasWarnings ? "warn" : "pass",
    webhookUrl: url,
    latencyMs: probe.latencyMs,
    checks,
  }
}

// ─── Session Operations (via Gateway HTTP API) ───────────────

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
  if (!url) return []
  const result = (await gatewayToolInvoke(url, token, "sessions_list")) as {
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
  if (!url) return null
  return gatewayToolInvoke(url, token, "sessions_history", { sessionKey, limit })
}
