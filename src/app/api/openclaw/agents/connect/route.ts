import { NextResponse } from "next/server"
import { testEnvironment } from "../../../lib/openclaw-adapter"
import { saveAgent } from "../../../lib/openclaw-store"
import { registerAgent } from "../../../lib/bridge"
import { generateToken } from "../../../lib/auth"
import type { HeartbeatConfig } from "../../../lib/openclaw-store"

/**
 * POST /api/openclaw/agents/connect
 *
 * Register an OpenClaw Gateway agent with the XO Org bridge.
 * Matches the Paperclip pattern: Gateway URL + payload template.
 *
 * Body:
 *  {
 *    agentId: "aria",
 *    name: "Aria",
 *    role: "Engineering",
 *    model: "claude-opus-4",
 *    modelProvider: "anthropic",
 *    permission: "member",
 *    channels: ["general"],
 *    description: "...",
 *    systemInstructions: "...",
 *    adapterType: "openclaw_gateway",
 *    gatewayUrl: "http://127.0.0.1:18789",
 *    gatewayToken: "xo",
 *    payloadTemplate: { "agentId": "{{agent.id}}", ... },
 *    heartbeat: { enabled: false, intervalSec: 300, wakeOnDemand: true, maxConcurrentRuns: 1 }
 *  }
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
    adapterType, gatewayUrl, gatewayToken, payloadTemplate, heartbeat,
  } = body as {
    agentId?: string
    name?: string
    role?: string
    model?: string
    modelProvider?: string
    permission?: string
    channels?: string[]
    description?: string
    systemInstructions?: string
    adapterType?: string
    gatewayUrl?: string
    gatewayToken?: string
    payloadTemplate?: Record<string, unknown>
    heartbeat?: Partial<HeartbeatConfig>
  }

  if (!agentId?.trim()) {
    return NextResponse.json({ ok: false, error: "agentId is required" }, { status: 400 })
  }

  if (!gatewayUrl?.trim()) {
    return NextResponse.json({ ok: false, error: "gatewayUrl is required" }, { status: 400 })
  }

  // Test Gateway reachability before registering
  const envTest = await testEnvironment(gatewayUrl, gatewayToken)
  if (envTest.status === "fail") {
    return NextResponse.json(
      { ok: false, error: envTest.checks.find((c) => c.level === "error")?.message ?? "Gateway unreachable", checks: envTest.checks },
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

    // Store with full Paperclip-style config
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
      gatewayToken: gatewayToken?.trim() ?? "xo",
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
        heartbeat: agent.heartbeat,
        status: agent.status,
        token,
        environmentTest: envTest,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Failed to register: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
