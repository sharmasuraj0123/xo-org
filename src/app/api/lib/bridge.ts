/**
 * cc-bridge adapter — wraps bridge.py operations for the Next.js API layer.
 *
 * In production this would shell out to bridge.py or import a TS port.
 * For now, we provide an in-memory implementation that mirrors bridge's
 * append-only event log + cursor-based read semantics.
 */

import type {
  AgentManifest,
  MessageEnvelope,
  MessageType,
  Channel,
  GovernanceConfig,
  Task,
  TaskStatus,
} from "./types"

// ─── In-Memory Event Log ─────────────────────────────────────
// Mirrors log.jsonl — single append-only array, all state derived

const eventLog: MessageEnvelope[] = []
const agents: Map<string, AgentManifest> = new Map()
const channels: Map<string, Channel> = new Map()
const tasks: Map<string, Task> = new Map()

let idCounter = 0
function nextId(prefix: string): string {
  idCounter++
  const ts = Date.now().toString(16).padStart(13, "0")
  const rand = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${ts}_${rand}`
}

// ─── Default Governance ──────────────────────────────────────
let governance: GovernanceConfig = {
  taskApproval: {
    required: true,
    approverRoles: ["admin", "mod"],
    autoApprove: { roles: ["Engineering"], maxCost: 0, channels: ["sandbox"] },
  },
  rateLimit: {
    messagesPerMinute: 30,
    tasksPerHour: 10,
    perAgent: true,
  },
  backpressure: {
    enabled: true,
    maxActiveTasks: 3,
    queueOverflow: "queue",
  },
  escalation: {
    idleTaskTimeout: 300,
    escalateTo: "@admin",
  },
}

// ─── Seed default channels ──────────────────────────────────
for (const ch of ["general", "code-review", "design", "devops", "approvals"]) {
  channels.set(ch, {
    name: ch,
    topic: "",
    createdBy: "system",
    members: [],
    pinned: [],
    createdAt: Date.now(),
  })
}

// ─── Seed default tasks ─────────────────────────────────────
const seedTasks: Array<{ title: string; status: TaskStatus; assignee: string; channel: string }> = [
  { title: "Analyze competitor landscape for Q2", status: "in_progress", assignee: "aria", channel: "general" },
  { title: "Deploy v2.3.1 to staging", status: "in_progress", assignee: "rex", channel: "devops" },
  { title: "Code review: auth refactor PR #142", status: "pending_review", assignee: "nova", channel: "code-review" },
  { title: "Design token audit", status: "assigned", assignee: "lux", channel: "design" },
  { title: "Security scan on API endpoints", status: "created", assignee: "kira", channel: "approvals" },
  { title: "Write onboarding documentation", status: "completed", assignee: "aria", channel: "general" },
  { title: "Migrate session store to PostgreSQL", status: "completed", assignee: "nova", channel: "code-review" },
]

for (const seed of seedTasks) {
  const task: Task = {
    id: nextId("t"),
    title: seed.title,
    description: "",
    status: seed.status,
    assignee: seed.assignee,
    createdBy: "system",
    channel: seed.channel,
    artifacts: [],
    ref: nextId("ref"),
    createdAt: Date.now() - Math.floor(Math.random() * 86400000),
    updatedAt: Date.now() - Math.floor(Math.random() * 3600000),
    history: [{ status: "created", by: "system", at: Date.now() }],
  }
  tasks.set(task.id, task)
}

// ─── Agent Operations ────────────────────────────────────────

export function registerAgent(manifest: Partial<AgentManifest>): AgentManifest {
  const now = Date.now()
  const agent: AgentManifest = {
    id: manifest.id!,
    name: manifest.name ?? manifest.id!,
    role: manifest.role ?? "Support",
    status: "active",
    model: manifest.model ?? "unknown",
    lastActive: "just now",
    currentTask: null,
    channels: manifest.channels ?? ["general"],
    tasksCompleted: 0,
    capacity: manifest.capacity ?? 3,
    activeTasks: 0,
    permission: manifest.permission ?? "member",
    cursor: eventLog.length,
    connectedAt: now,
    lastPulse: now,
  }

  agents.set(agent.id, agent)

  // Join channels
  for (const ch of agent.channels) {
    const channel = channels.get(ch)
    if (channel && !channel.members.includes(agent.id)) {
      channel.members.push(agent.id)
    }
  }

  return agent
}

export function getAgent(id: string): AgentManifest | undefined {
  return agents.get(id)
}

export function listAgents(): AgentManifest[] {
  return Array.from(agents.values())
}

export function updateAgentPulse(
  id: string,
  update: { status?: string; currentTask?: string | null; load?: number }
): AgentManifest | undefined {
  const agent = agents.get(id)
  if (!agent) return undefined

  agent.lastPulse = Date.now()
  agent.lastActive = "just now"
  if (update.status === "active" || update.status === "idle") {
    agent.status = update.status
  }
  if (update.currentTask !== undefined) {
    agent.currentTask = update.currentTask
  }

  return agent
}

export function removeAgent(id: string): boolean {
  const agent = agents.get(id)
  if (!agent) return false

  // Leave all channels
  for (const ch of agent.channels) {
    const channel = channels.get(ch)
    if (channel) {
      channel.members = channel.members.filter((m) => m !== id)
    }
  }

  agents.delete(id)
  return true
}

// ─── Message Operations ──────────────────────────────────────

export function appendMessage(
  from: string,
  to: string,
  type: MessageType,
  payload: MessageEnvelope["payload"],
  ref?: string
): MessageEnvelope {
  const msg: MessageEnvelope = {
    id: nextId("m"),
    from,
    to,
    type,
    payload,
    ref,
    ts: Date.now() / 1000,
    routed: resolveRecipients(to),
  }

  // Resolve channel
  if (to.startsWith("#")) {
    msg.channel = to.slice(1)
  }

  eventLog.push(msg)
  return msg
}

export function readMessages(cursor: number, agentId?: string): { messages: MessageEnvelope[]; nextCursor: number } {
  const newEvents = eventLog.slice(cursor)
  const filtered = agentId
    ? newEvents.filter((m) => shouldDeliver(m, agentId))
    : newEvents

  return {
    messages: filtered,
    nextCursor: eventLog.length,
  }
}

export function getChannelHistory(channelName: string, limit = 50): MessageEnvelope[] {
  return eventLog
    .filter((m) => m.channel === channelName || m.to === `#${channelName}`)
    .slice(-limit)
}

function shouldDeliver(msg: MessageEnvelope, agentId: string): boolean {
  // Direct message
  if (msg.to === agentId) return true
  // Broadcast
  if (msg.to === "*") return true
  // Channel — agent must be subscribed
  if (msg.to.startsWith("#")) {
    const agent = agents.get(agentId)
    return agent?.channels.includes(msg.to.slice(1)) ?? false
  }
  // @role — check if agent was routed
  if (msg.routed?.includes(agentId)) return true

  return false
}

function resolveRecipients(to: string): string[] {
  // Direct
  if (!to.startsWith("@") && !to.startsWith("#") && to !== "*") {
    return agents.has(to) ? [to] : []
  }
  // Broadcast
  if (to === "*") return Array.from(agents.keys())
  // Channel
  if (to.startsWith("#")) {
    const ch = channels.get(to.slice(1))
    return ch?.members ?? []
  }
  // @role — pick best available agent by load
  if (to.startsWith("@")) {
    const role = to.slice(1)
    const candidates = Array.from(agents.values())
      .filter((a) => a.role === role && a.status === "active")
      .sort((a, b) => (a.activeTasks / a.capacity) - (b.activeTasks / b.capacity))

    if (candidates.length > 0 && candidates[0].activeTasks < candidates[0].capacity) {
      return [candidates[0].id]
    }
    return []
  }

  return []
}

// ─── Channel Operations ──────────────────────────────────────

export function listChannels(): Channel[] {
  return Array.from(channels.values())
}

export function getChannel(name: string): Channel | undefined {
  return channels.get(name)
}

export function createChannel(name: string, createdBy: string, topic = ""): Channel {
  const channel: Channel = {
    name,
    topic,
    createdBy,
    members: [createdBy],
    pinned: [],
    createdAt: Date.now(),
  }
  channels.set(name, channel)
  return channel
}

// ─── Task Operations ─────────────────────────────────────────

export function createTask(
  title: string,
  description: string,
  createdBy: string,
  channel: string,
  assignTo?: string
): Task {
  const task: Task = {
    id: nextId("t"),
    title,
    description,
    status: assignTo ? "assigned" : "created",
    assignee: assignTo ?? null,
    createdBy,
    channel,
    artifacts: [],
    ref: nextId("ref"),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    history: [{ status: "created", by: createdBy, at: Date.now() }],
  }

  if (assignTo) {
    task.history.push({ status: "assigned", by: createdBy, at: Date.now() })
  }

  tasks.set(task.id, task)
  return task
}

export function getTask(id: string): Task | undefined {
  return tasks.get(id)
}

export function listTasks(filter?: { status?: TaskStatus; assignee?: string }): Task[] {
  let result = Array.from(tasks.values())
  if (filter?.status) result = result.filter((t) => t.status === filter.status)
  if (filter?.assignee) result = result.filter((t) => t.assignee === filter.assignee)
  return result.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function updateTaskStatus(
  id: string,
  status: TaskStatus,
  by: string,
  note?: string
): Task | undefined {
  const task = tasks.get(id)
  if (!task) return undefined

  task.status = status
  task.updatedAt = Date.now()
  task.history.push({ status, by, at: Date.now(), note })

  return task
}

// ─── Governance Operations ───────────────────────────────────

export function getGovernance(): GovernanceConfig {
  return governance
}

export function updateGovernance(partial: Partial<GovernanceConfig>): GovernanceConfig {
  governance = { ...governance, ...partial }
  return governance
}

// ─── SSE Subscriptions ───────────────────────────────────────

type EventCallback = (msg: MessageEnvelope) => void
const subscribers: Map<string, EventCallback> = new Map()

export function subscribe(agentId: string, callback: EventCallback): () => void {
  subscribers.set(agentId, callback)
  return () => { subscribers.delete(agentId) }
}

export function notifySubscribers(msg: MessageEnvelope) {
  for (const [agentId, callback] of subscribers) {
    if (shouldDeliver(msg, agentId)) {
      callback(msg)
    }
  }
}

// ─── Event Log Stats ─────────────────────────────────────────

export function getStats() {
  const now = Date.now()
  const activeAgents = Array.from(agents.values()).filter((a) => a.status === "active")
  const recentMessages = eventLog.filter((m) => m.ts * 1000 > now - 3600000)

  return {
    totalAgents: agents.size,
    activeAgents: activeAgents.length,
    totalMessages: eventLog.length,
    messagesLastHour: recentMessages.length,
    totalTasks: tasks.size,
    activeTasks: Array.from(tasks.values()).filter(
      (t) => t.status === "in_progress" || t.status === "assigned"
    ).length,
    channelCount: channels.size,
    serverTime: now,
  }
}
