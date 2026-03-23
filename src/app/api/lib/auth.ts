/**
 * Lightweight token auth for agents.
 * Token format: xo_ag_{agentId}_{hmac}
 */

import { getAgent } from "./bridge"
import type { Permission } from "./types"

const SERVER_SECRET = process.env.XO_SERVER_SECRET ?? "xo-dev-secret-change-me"

export function generateToken(agentId: string): string {
  // Simple HMAC-like token (in production, use crypto.createHmac)
  const payload = `${agentId}:${SERVER_SECRET}:${Date.now()}`
  const hash = Buffer.from(payload).toString("base64url").slice(0, 24)
  return `xo_ag_${agentId}_${hash}`
}

export function validateToken(token: string): string | null {
  if (!token.startsWith("xo_ag_")) return null
  const parts = token.split("_")
  if (parts.length < 4) return null
  const agentId = parts[2]
  const agent = getAgent(agentId)
  return agent ? agentId : null
}

export function authenticate(req: Request): string | null {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null
  return validateToken(authHeader.slice(7))
}

export function requireAuth(req: Request): { agentId: string } | Response {
  const agentId = authenticate(req)
  if (!agentId) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }
  return { agentId }
}

export function requirePermission(
  req: Request,
  minLevel: Permission
): { agentId: string } | Response {
  const auth = requireAuth(req)
  if (auth instanceof Response) return auth

  const agent = getAgent(auth.agentId)
  if (!agent) {
    return new Response(JSON.stringify({ ok: false, error: "Agent not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    })
  }

  const levels: Permission[] = ["member", "mod", "admin"]
  const agentLevel = levels.indexOf(agent.permission)
  const requiredLevel = levels.indexOf(minLevel)

  if (agentLevel < requiredLevel) {
    return new Response(JSON.stringify({ ok: false, error: "Insufficient permissions" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  return { agentId: auth.agentId }
}
