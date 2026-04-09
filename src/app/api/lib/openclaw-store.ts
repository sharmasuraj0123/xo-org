/**
 * OpenClaw agent connection persistence.
 *
 * Stores agents connected via OpenClaw HTTP webhook adapter.
 * Each agent has its own webhook URL, auth header, payload template,
 * and heartbeat config.
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
  adapterType: "openclaw_webhook" | "http"

  /** OpenClaw webhook endpoint URL (e.g. https://api.example.com/webhook) */
  url: string
  /** Authorization header value (e.g. "Bearer my-token") */
  webhookAuthHeader: string
  /** Additional custom headers */
  customHeaders?: Record<string, string>
  /** HTTP method (default: POST) */
  method?: string
  /** Request timeout in seconds (default: 30) */
  timeoutSec: number

  /** Session key strategy */
  sessionKeyStrategy: "issue" | "fixed" | "run"
  /** Fixed session key (when strategy = "fixed") */
  fixedSessionKey?: string
  /** Tracked sessionId for continuity (set from webhook responses) */
  sessionId?: string

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

import fs from "node:fs"
import path from "node:path"

const STORE_PATH = path.join(process.cwd(), ".data", "openclaw-agents.json")

function loadFromDisk(): Map<string, OpenClawAgent> {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STORE_PATH, "utf-8")) as OpenClawAgent[]
      return new Map(data.map((a) => [a.agentId, a]))
    }
  } catch { /* ignore corrupt file */ }
  return new Map()
}

function saveToDisk() {
  try {
    const dir = path.dirname(STORE_PATH)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(STORE_PATH, JSON.stringify(Array.from(agents.values()), null, 2))
  } catch { /* ignore write errors */ }
}

const agents = loadFromDisk()

export function saveAgent(agent: OpenClawAgent): OpenClawAgent {
  agents.set(agent.agentId, agent)
  saveToDisk()
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
  saveToDisk()
  return agent
}

export function removeAgent(agentId: string): boolean {
  const result = agents.delete(agentId)
  if (result) saveToDisk()
  return result
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
