import { NextResponse } from "next/server"
import { probeGateway, type GatewayConfig } from "../../../lib/openclaw-gateway"

/**
 * POST /api/openclaw/agents/test-environment
 *
 * Test Gateway connectivity using the real WebSocket V3 protocol.
 * Matches Paperclip's "Test environment" button behavior:
 *  1. Open WebSocket (3s timeout)
 *  2. Receive connect.challenge event
 *  3. Send connect request with credentials
 *  4. Report: "ok" | "challenge_only" | "failed"
 */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch { /* use defaults */ }

  const { gatewayUrl, gatewayToken, password, disableDeviceAuth } = body as {
    gatewayUrl?: string
    gatewayToken?: string
    password?: string
    disableDeviceAuth?: boolean
  }

  const url = gatewayUrl || process.env.OPENCLAW_GATEWAY_URL || "ws://127.0.0.1:18789"
  const token = gatewayToken || process.env.OPENCLAW_GATEWAY_TOKEN || ""

  const config: GatewayConfig = {
    url,
    authToken: token,
    password,
    disableDeviceAuth: disableDeviceAuth ?? false,
    autoPairOnFirstConnect: true,
  }

  const checks: Array<{ code: string; level: "info" | "warn" | "error"; message: string }> = []

  // Validate URL format
  try {
    const parsed = new URL(url)
    if (!["ws:", "wss:"].includes(parsed.protocol)) {
      checks.push({ code: "url_protocol", level: "error", message: `URL must use ws:// or wss:// (got ${parsed.protocol})` })
      return NextResponse.json({ ok: true, data: { status: "fail", gatewayUrl: url, latencyMs: 0, checks } })
    }
    if (parsed.protocol === "ws:" && !["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname)) {
      checks.push({ code: "url_insecure", level: "warn", message: `Using ws:// to non-localhost (${parsed.hostname}) — consider wss://` })
    }
  } catch {
    checks.push({ code: "url_invalid", level: "error", message: `Cannot parse URL: ${url}` })
    return NextResponse.json({ ok: true, data: { status: "fail", gatewayUrl: url, latencyMs: 0, checks } })
  }

  if (!token && !password) {
    checks.push({ code: "auth_missing", level: "warn", message: "No auth token or password — connection may fail" })
  }

  // Probe the Gateway via WebSocket
  const probe = await probeGateway(config)

  if (probe.status === "ok") {
    checks.push({ code: "gateway_reachable", level: "info", message: `Gateway authenticated at ${url}` })
    checks.push({ code: "gateway_latency", level: "info", message: `Round-trip: ${probe.latencyMs}ms` })
  } else if (probe.status === "challenge_only") {
    checks.push({ code: "gateway_reachable", level: "info", message: `Gateway reachable at ${url}` })
    checks.push({ code: "gateway_auth", level: "warn", message: "Connected but authentication failed — check token/password" })
  } else {
    checks.push({ code: "gateway_reachable", level: "error", message: probe.error ?? `Cannot reach Gateway at ${url}` })
  }

  const hasErrors = checks.some((c) => c.level === "error")
  const hasWarnings = checks.some((c) => c.level === "warn")

  return NextResponse.json({
    ok: true,
    data: {
      status: hasErrors ? "fail" : hasWarnings ? "warn" : "pass",
      gatewayUrl: url,
      latencyMs: probe.latencyMs,
      checks,
    },
  })
}
