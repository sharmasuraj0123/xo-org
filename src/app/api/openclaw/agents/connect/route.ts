import { NextResponse } from "next/server"
import { probeGateway, type GatewayConfig } from "../../../lib/openclaw-gateway"
import { saveAgent } from "../../../lib/openclaw-store"
import { registerAgent } from "../../../lib/bridge"
import { generateToken } from "../../../lib/auth"
import type { HeartbeatConfig } from "../../../lib/openclaw-store"

/**
 * POST /api/openclaw/agents/connect
 *
 * Register an OpenClaw Gateway agent with the XO Org bridge.
 * Validates Gateway connectivity via WebSocket V3 probe before registering.
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
    adapterType, gatewayUrl, gatewayToken, gatewayPassword,
    privateKeyPem, disableDeviceAuth, autoPairOnFirstConnect,
    sessionKeyStrategy, fixedSessionKey,
    payloadTemplate, heartbeat,
  } = body as {
    agentId?: string; name?: string; role?: string; model?: string
    modelProvider?: string; permission?: string; channels?: string[]
    description?: string; systemInstructions?: string; adapterType?: string
    gatewayUrl?: string; gatewayToken?: string; gatewayPassword?: string
    privateKeyPem?: string; disableDeviceAuth?: boolean; autoPairOnFirstConnect?: boolean
    sessionKeyStrategy?: string; fixedSessionKey?: string
    payloadTemplate?: Record<string, unknown>; heartbeat?: Partial<HeartbeatConfig>
  }

  if (!agentId?.trim()) {
    return NextResponse.json({ ok: false, error: "agentId is required" }, { status: 400 })
  }
  if (!gatewayUrl?.trim()) {
    return NextResponse.json({ ok: false, error: "gatewayUrl is required" }, { status: 400 })
  }

  // Validate URL protocol
  try {
    const parsed = new URL(gatewayUrl)
    if (!["ws:", "wss:"].includes(parsed.protocol)) {
      return NextResponse.json(
        { ok: false, error: "Gateway URL must use ws:// or wss:// protocol" },
        { status: 400 }
      )
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid Gateway URL" }, { status: 400 })
  }

  // Probe Gateway via WebSocket before registering
  const config: GatewayConfig = {
    url: gatewayUrl.trim(),
    authToken: gatewayToken?.trim() || undefined,
    password: gatewayPassword || undefined,
    disableDeviceAuth: disableDeviceAuth ?? false,
    autoPairOnFirstConnect: autoPairOnFirstConnect ?? true,
  }

  const probe = await probeGateway(config)
  if (probe.status === "failed") {
    return NextResponse.json(
      { ok: false, error: `Cannot reach Gateway: ${probe.error ?? "connection failed"}`, latencyMs: probe.latencyMs },
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
      adapterType: (adapterType as "openclaw_gateway" | "http") ?? "openclaw_gateway",
      gatewayUrl: gatewayUrl.trim(),
      gatewayToken: gatewayToken?.trim() ?? "",
      gatewayPassword: gatewayPassword || undefined,
      privateKeyPem: privateKeyPem || undefined,
      disableDeviceAuth: disableDeviceAuth ?? false,
      autoPairOnFirstConnect: autoPairOnFirstConnect ?? true,
      sessionKeyStrategy: (sessionKeyStrategy as "issue" | "fixed" | "run") ?? "issue",
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
        gatewayUrl: agent.gatewayUrl,
        adapterType: agent.adapterType,
        sessionKeyStrategy: agent.sessionKeyStrategy,
        heartbeat: agent.heartbeat,
        status: agent.status,
        token,
        gatewayProbe: { status: probe.status, latencyMs: probe.latencyMs },
      },
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Failed to register: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
