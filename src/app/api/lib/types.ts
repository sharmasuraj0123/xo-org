// ─── Agent Types ─────────────────────────────────────────────
export type AgentStatus = "active" | "idle" | "offline"

export type AgentRole =
  | "Research"
  | "Engineering"
  | "DevOps"
  | "Design"
  | "Product"
  | "Analytics"
  | "Security"
  | "Support"

export type Permission = "admin" | "mod" | "member"

export interface AgentManifest {
  id: string
  name: string
  role: AgentRole
  status: AgentStatus
  model: string
  lastActive: string
  currentTask: string | null
  channels: string[]
  tasksCompleted: number
  // Server-side fields
  capacity: number
  activeTasks: number
  permission: Permission
  cursor: number
  connectedAt: number
  lastPulse: number
}

// ─── Message Types ───────────────────────────────────────────
export type MessageType =
  | "task"
  | "reply"
  | "tell"
  | "ask"
  | "approve"
  | "reject"
  | "ping"

export interface MessageEnvelope {
  id: string
  from: string
  to: string // agent-id | @role | #channel | *
  type: MessageType
  payload: {
    text: string
    artifacts?: string[]
    metadata?: Record<string, unknown>
  }
  ref?: string
  ts: number
  channel?: string
  routed?: string[]
}

// ─── Task Types ──────────────────────────────────────────────
export type TaskStatus =
  | "created"
  | "assigned"
  | "in_progress"
  | "pending_review"
  | "completed"
  | "revision"
  | "cancelled"

export interface TaskEvent {
  status: TaskStatus
  by: string
  at: number
  note?: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  assignee: string | null
  createdBy: string
  channel: string
  artifacts: string[]
  ref: string
  createdAt: number
  updatedAt: number
  history: TaskEvent[]
}

// ─── Governance Types ────────────────────────────────────────
export interface GovernanceConfig {
  taskApproval: {
    required: boolean
    approverRoles: Permission[]
    autoApprove: {
      roles: AgentRole[]
      maxCost: number
      channels: string[]
    }
  }
  rateLimit: {
    messagesPerMinute: number
    tasksPerHour: number
    perAgent: boolean
  }
  backpressure: {
    enabled: boolean
    maxActiveTasks: number
    queueOverflow: "reject" | "queue" | "alert"
  }
  escalation: {
    idleTaskTimeout: number
    escalateTo: string
  }
}

export interface Channel {
  name: string
  topic: string
  createdBy: string
  members: string[]
  pinned: string[]
  createdAt: number
}

// ─── Objective & Key Result Types ────────────────────────────
export type ObjStatus = "On Track" | "At Risk" | "Behind" | "Completed" | "Not Started"
export type KRStatus = "proposed" | "approved" | "rejected" | "completed"

export interface KeyResult {
  id: string
  objectiveId: string
  title: string
  status: KRStatus
  current: string
  target: string
  unit: string
  confidence: number
  progress: number
  proposedBy: string
  approvedBy?: string
  proposedAt: number
  owner: string
  ownerInitials: string
}

export interface Objective {
  id: string
  channelId: string
  title: string
  humanOwner: string
  humanOwnerInitials: string
  aiOwner: string
  status: ObjStatus
  progress: number
  timePeriod: string
  createdAt: number
  lastActivity: number
  keyResults: KeyResult[]
  skills: string[]
  artifacts: string[]
  instructions: string
  parentMessageId?: string
}

// ─── API Response Types ──────────────────────────────────────
export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  cursor: number
  hasMore: boolean
}
