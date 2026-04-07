import { NextResponse } from "next/server"
import { isOpenClawConfigured, listGatewaySessions, pingGateway } from "../../../lib/openclaw-adapter"
import { saveAgent, getAgent } from "../../../lib/openclaw-store"
import { registerAgent } from "../../../lib/bridge"
import { generateToken } from "../../../lib/auth"

/**
 * POST /api/openclaw/agents/connect
 *
 * Connect an OpenClaw Gateway agent to the XO Org bridge.
 *
 * Body:
 *  {
 *    agentId: "aria",             // ID to register in the bridge
 *    sessionKey: "agent:main:main", // OpenClaw Gateway session key
 *    name?: "Aria",               // Display name
 *    role?: "Engineering",        // Bridge role
 *    model?: "claude-opus-4",     // Model identifier
 *    channels?: ["general"]       // Channels to join
 *  }
 *
 * If sessionKey is omitted, lists available sessions from the Gateway
 * so the user can pick one.
 */
export async function POST(req: Request) {
  if (!isOpenClawConfigured()) {
    return NextResponse.json(
      { ok: false, error: "OpenClaw Gateway not configured. Set OPENCLAW_GATEWAY_URL." },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const { agentId, sessionKey, name, role, model, channels } = body as {
    agentId?: string
    sessionKey?: string
    name?: string
    role?: string
    model?: string
    channels?: string[]
  }

  // If no sessionKey, return available sessions for the user to pick
  if (!sessionKey) {
    try {
      const ping = await pingGateway()
      if (!ping.ok) {
        return NextResponse.json(
          { ok: false, error: `Cannot reach Gateway at ${ping.url}` },
          { status: 502 }
        )
      }
      const sessions = await listGatewaySessions()
      return NextResponse.json({
        ok: true,
        data: {
          action: "pick_session",
          gatewayUrl: ping.url,
          latencyMs: ping.latencyMs,
          sessions: sessions.map((s) => ({
            key: s.key,
            sessionId: s.sessionId,
            model: s.model,
            modelProvider: s.modelProvider,
            totalTokens: s.totalTokens,
            updatedAt: s.updatedAt,
          })),
        },
      })
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: `Gateway error: ${err instanceof Error ? err.message : String(err)}` },
        { status: 502 }
      )
    }
  }

  if (!agentId) {
    return NextResponse.json({ ok: false, error: "agentId is required" }, { status: 400 })
  }

  // Check if already connected
  const existing = getAgent(agentId)
  if (existing?.status === "connected") {
    return NextResponse.json(
      { ok: false, error: `Agent '${agentId}' is already connected` },
      { status: 409 }
    )
  }

  // Verify the session exists in the Gateway
  try {
    const sessions = await listGatewaySessions()
    const session = sessions.find((s) => s.key === sessionKey)
    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          error: `Session '${sessionKey}' not found in Gateway`,
          availableSessions: sessions.map((s) => s.key),
        },
        { status: 404 }
      )
    }

    // Register in XO Org bridge
    const agentRole = role ?? "Engineering"
    const agentChannels = channels ?? ["general"]
    const bridgeAgent = registerAgent({
      id: agentId,
      name: name ?? agentId,
      role: agentRole as "Engineering",
      model: model ?? session.model ?? "unknown",
      channels: agentChannels,
    })
    const token = generateToken(bridgeAgent.id)

    // Store OpenClaw ↔ Bridge mapping
    const agent = saveAgent({
      agentId,
      sessionKey,
      name: name ?? agentId,
      role: agentRole,
      model: model ?? session.model ?? "unknown",
      channels: agentChannels,
      token,
      status: "connected",
      connectedAt: Date.now(),
      updatedAt: Date.now(),
      totalTokens: session.totalTokens ?? 0,
    })

    return NextResponse.json({
      ok: true,
      data: {
        agentId: agent.agentId,
        sessionKey: agent.sessionKey,
        name: agent.name,
        role: agent.role,
        model: agent.model,
        channels: agent.channels,
        token,
        status: agent.status,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `Failed to connect: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}
