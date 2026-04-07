/**
 * OpenClaw agent connection persistence.
 *
 * Tracks which OpenClaw Gateway agents are registered in the XO Org bridge.
 * Each entry maps a bridge agent ID ↔ OpenClaw session key.
 */

export interface OpenClawAgent {
  /** Agent ID in XO Org bridge */
  agentId: string
  /** Session key in OpenClaw Gateway (e.g. "agent:main:main") */
  sessionKey: string
  /** Display name */
  name: string
  /** Agent role in the org */
  role: string
  /** Model used by this agent */
  model: string
  /** Channels the agent is joined to */
  channels: string[]
  /** Bridge auth token */
  token: string
  /** Connection status */
  status: "connected" | "disconnected"
  connectedAt: number
  updatedAt: number
  /** Last known token usage from Gateway */
  totalTokens: number
}

const agents = new Map<string, OpenClawAgent>()

export function saveAgent(agent: OpenClawAgent): OpenClawAgent {
  agents.set(agent.agentId, agent)
  return agent
}

export function getAgent(agentId: string): OpenClawAgent | undefined {
  return agents.get(agentId)
}

export function getAgentBySession(sessionKey: string): OpenClawAgent | undefined {
  for (const agent of agents.values()) {
    if (agent.sessionKey === sessionKey) return agent
  }
  return undefined
}

export function listAgents(): OpenClawAgent[] {
  return Array.from(agents.values())
}

export function getActiveAgents(): OpenClawAgent[] {
  return listAgents().filter((a) => a.status === "connected")
}

export function updateAgent(
  agentId: string,
  update: Partial<OpenClawAgent>
): OpenClawAgent | undefined {
  const agent = agents.get(agentId)
  if (!agent) return undefined
  Object.assign(agent, update, { updatedAt: Date.now() })
  return agent
}

export function removeAgent(agentId: string): boolean {
  return agents.delete(agentId)
}
