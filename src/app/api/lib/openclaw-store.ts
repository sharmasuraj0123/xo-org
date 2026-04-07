/**
 * OpenClaw agent connection persistence.
 *
 * Stores agents connected via OpenClaw Gateway adapter.
 * Each agent has its own Gateway URL, payload template, and heartbeat config.
 */

export interface HeartbeatConfig {
  enabled: boolean
  intervalSec: number
  wakeOnDemand: boolean
  maxConcurrentRuns: number
}

export interface OpenClawAgent {
  /** Agent ID in XO Org bridge */
  agentId: string
  /** Display name */
  name: string
  /** Agent role in the org */
  role: string
  /** Model used by this agent */
  model: string
  /** Model provider (anthropic, openai, etc.) */
  modelProvider: string
  /** Channels the agent is joined to */
  channels: string[]
  /** Permission level */
  permission: string
  /** Description / instructions */
  description: string
  systemInstructions: string

  /** Adapter type */
  adapterType: "openclaw_gateway" | "http"

  /** OpenClaw Gateway WebSocket URL (e.g. ws://127.0.0.1:18789) */
  gatewayUrl: string
  /** Auth token for Gateway */
  gatewayToken: string
  /** Optional password auth */
  gatewayPassword?: string
  /** ED25519 private key PEM for device auth (empty = ephemeral) */
  privateKeyPem?: string
  /** Disable ED25519 device signing */
  disableDeviceAuth?: boolean
  /** Auto-approve device pairing on first connect */
  autoPairOnFirstConnect: boolean
  /** Session key strategy */
  sessionKeyStrategy: "issue" | "fixed" | "run"
  /** Fixed session key (when strategy = "fixed") */
  fixedSessionKey?: string
  /** Payload template JSON — interpolated with context vars on invocation */
  payloadTemplate: Record<string, unknown>

  /** Heartbeat / run policy */
  heartbeat: HeartbeatConfig

  /** Bridge auth token */
  token: string
  /** Connection status */
  status: "connected" | "disconnected" | "error"
  error?: string
  connectedAt: number
  updatedAt: number
  /** Last heartbeat run timestamp */
  lastHeartbeatAt: number | null
  /** Total runs completed */
  totalRuns: number
}

const agents = new Map<string, OpenClawAgent>()

export function saveAgent(agent: OpenClawAgent): OpenClawAgent {
  agents.set(agent.agentId, agent)
  return agent
}

export function getAgent(agentId: string): OpenClawAgent | undefined {
  return agents.get(agentId)
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

/**
 * Get agents due for a heartbeat (interval elapsed).
 */
export function getAgentsDueForHeartbeat(): OpenClawAgent[] {
  const now = Date.now()
  return listAgents().filter((a) => {
    if (a.status !== "connected") return false
    if (!a.heartbeat.enabled || a.heartbeat.intervalSec <= 0) return false
    const lastBeat = a.lastHeartbeatAt ?? a.connectedAt
    return (now - lastBeat) >= a.heartbeat.intervalSec * 1000
  })
}
