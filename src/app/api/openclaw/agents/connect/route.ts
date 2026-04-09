import { NextResponse } from "next/server"
import { probeWebhook, type OpenClawConfig } from "../../../lib/openclaw-gateway"
import { saveAgent } from "../../../lib/openclaw-store"
import { registerAgent } from "../../../lib/bridge"
import { generateToken } from "../../../lib/auth"
import type { HeartbeatConfig } from "../../../lib/openclaw-store"

/**
 * POST /api/openclaw/agents/connect
 *
 * Register an OpenClaw HTTP webhook agent with the XO Org bridge.
 * Validates webhook connectivity via HTTP probe before registering.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const {
    agentId, name, role, model, modelProvider, permission,
    channels, description, systemInstructions,
    adapterType, url, webhookAuthHeader, customHeaders,
    method, timeoutSec,
    sessionKeyStrategy, fixedSessionKey,
    payloadTemplate, heartbeat,
  } = body as {
    agentId?: string; name?: string; role?: string; model?: string
    modelProvider?: string; permission?: string; channels?: string[]
    description?: string; systemInstructions?: string; adapterType?: string
    url?: string; webhookAuthHeader?: string; customHeaders?: Record<string, string>
    method?: string; timeoutSec?: number
    sessionKeyStrategy?: string; fixedSessionKey?: string
    payloadTemplate?: Record<string, unknown>; heartbeat?: Partial<HeartbeatConfig>
  }

  if (!agentId?.trim()) {
    return NextResponse.json({ ok: false, error: "agentId is required" }, { status: 400 })
  }
  if (!url?.trim()) {
    return NextResponse.json({ ok: false, error: "url (webhook endpoint) is required" }, { status: 400 })
  }

  // Validate URL protocol
  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json(
        { ok: false, error: "Webhook URL must use http:// or https:// protocol" },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid webhook URL" }, { status: 400 })
  }

  // Probe webhook before registering
  const config: OpenClawConfig = {
    url: url.trim(),
    webhookAuthHeader: webhookAuthHeader?.trim() || undefined,
    customHeaders,
    method,
  }

  const probe = await probeWebhook(config)
  if (probe.status === "failed") {
    return NextResponse.json(
      { ok: false, error: `Cannot reach webhook: ${probe.error ?? "connection failed"}`, latencyMs: probe.latencyMs },
      { status: 502 }
    )
  }

  // Register in XO Org bridge
  try {
    const bridgeAgent = registerAgent({
      id: agentId.trim(),
      name: name?.trim() ?? agentId.trim(),
      role: (role ?? "Engineering") as "Engineering",
      model: model ?? "claude-sonnet",
      channels: channels ?? ["general"],
    })
    const token = generateToken(bridgeAgent.id)

    const agent = saveAgent({
      agentId: agentId.trim(),
      name: name?.trim() ?? agentId.trim(),
      role: role ?? "Engineering",
      model: model ?? "claude-sonnet",
      modelProvider: modelProvider ?? "anthropic",
      channels: channels ?? ["general"],
      permission: permission ?? "member",
      description: description ?? "",
      systemInstructions: systemInstructions ?? "",
      adapterType: (adapterType as "openclaw_webhook" | "http") ?? "openclaw_webhook",
      url: url.trim(),
      webhookAuthHeader: webhookAuthHeader?.trim() ?? "",
      customHeaders,
      method: method ?? "POST",
      timeoutSec: timeoutSec ?? 30,
      sessionKeyStrategy: (sessionKeyStrategy as "issue" | "fixed" | "run") ?? "fixed",
      fixedSessionKey: fixedSessionKey || undefined,
      payloadTemplate: payloadTemplate ?? { agentId: "{{agent.id}}" },
      heartbeat: {
        enabled: heartbeat?.enabled ?? false,
        intervalSec: heartbeat?.intervalSec ?? 300,
        wakeOnDemand: heartbeat?.wakeOnDemand ?? true,
        maxConcurrentRuns: heartbeat?.maxConcurrentRuns ?? 1,
      },
      token,
      status: "connected",
      connectedAt: Date.now(),
      updatedAt: Date.now(),
      lastHeartbeatAt: null,
      totalRuns: 0,
    })

    return NextResponse.json({
      ok: true,
      data: {
        agentId: agent.agentId,
        name: agent.name,
        url: agent.url,
        adapterType: agent.adapterType,
        sessionKeyStrategy: agent.sessionKeyStrategy,
        heartbeat: agent.heartbeat,
        status: agent.status,
        token,
        probe: { status: probe.status, latencyMs: probe.latencyMs },
      },
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Failed to register: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
