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
  | "tool_call"
  | "tool_result"

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

// ─── GitHub App Types ────────────────────────────────────────
export type GitHubConnectionStatus = "connected" | "disconnected" | "expired"

export interface GitHubInstallation {
  installationId: number
  githubUsername: string
  avatarUrl: string | null
  repoScope: "all" | string[]
  status: GitHubConnectionStatus
  connectedAt: number
  updatedAt: number
}

export interface GitHubInstallationToken {
  token: string
  expiresAt: number
  installationId: number
}

export interface GitHubRepo {
  id: number
  name: string
  fullName: string
  private: boolean
  description: string | null
  defaultBranch: string
  language: string | null
  url: string
}

export type GitHubWebhookEvent =
  | "installation"
  | "push"
  | "pull_request"
  | "issues"
  | "issue_comment"

// ─── GitHub Tool Types ──────────────────────────────────────

export type GitHubToolName =
  // Repos
  | "github.repos.list"
  | "github.repos.get"
  // File operations
  | "github.files.read"
  | "github.files.write"
  | "github.files.tree"
  // Branch operations
  | "github.branches.list"
  | "github.branches.create"
  // Commit operations
  | "github.commits.list"
  | "github.commits.push"
  // Pull request operations
  | "github.pulls.list"
  | "github.pulls.get"
  | "github.pulls.create"
  | "github.pulls.merge"
  | "github.pulls.comment"
  | "github.pulls.review"
  | "github.pulls.diff"
  // Issue operations
  | "github.issues.list"
  | "github.issues.get"
  | "github.issues.create"
  | "github.issues.update"
  | "github.issues.comment"
  // Search
  | "github.search.code"
  | "github.search.issues"
  | "github.search.repos"

export interface GitHubToolCall {
  tool: GitHubToolName
  params: Record<string, unknown>
}

export interface GitHubToolResult {
  tool: GitHubToolName
  ok: boolean
  data?: unknown
  error?: string
}

export interface GitHubToolDefinition {
  name: GitHubToolName
  description: string
  params: Record<string, { type: string; required: boolean; description: string }>
}

// ─── Gmail Types ────────────────────────────────────────────

export type GmailConnectionStatus = "connected" | "disconnected" | "expired"

export interface GmailConnection {
  email: string
  displayName: string
  avatarUrl: string | null
  encryptedRefreshToken: string
  encryptedAccessToken: string | null
  tokenExpiry: number
  scopes: string[]
  status: GmailConnectionStatus
  connectedAt: number
  updatedAt: number
}

export type GmailToolName =
  | "gmail.messages.list"
  | "gmail.messages.get"
  | "gmail.messages.send"
  | "gmail.messages.modify"
  | "gmail.messages.trash"
  | "gmail.messages.untrash"
  | "gmail.drafts.create"
  | "gmail.drafts.list"
  | "gmail.labels.list"
  | "gmail.threads.list"
  | "gmail.threads.get"

export interface GmailToolResult {
  tool: GmailToolName
  ok: boolean
  data?: unknown
  error?: string
}

export interface GmailToolDefinition {
  name: GmailToolName
  description: string
  params: Record<string, { type: string; required: boolean; description: string }>
}

// ─── Slack Types ────────────────────────────────────────────

export type SlackConnectionStatus = "connected" | "disconnected" | "revoked"

export interface SlackConnection {
  teamId: string
  teamName: string
  botUserId: string
  authedUserId: string
  encryptedBotToken: string
  encryptedUserToken: string | null
  status: SlackConnectionStatus
  connectedAt: number
  updatedAt: number
}

export type SlackToolName =
  | "slack.channels.list"
  | "slack.channels.history"
  | "slack.channels.join"
  | "slack.threads.replies"
  | "slack.messages.send"
  | "slack.messages.react"
  | "slack.users.list"
  | "slack.users.info"
  | "slack.search.messages"
  | "slack.files.upload"

export interface SlackToolResult {
  tool: SlackToolName
  ok: boolean
  data?: unknown
  error?: string
}

export interface SlackToolDefinition {
  name: SlackToolName
  description: string
  params: Record<string, { type: string; required: boolean; description: string }>
}

// ─── Stripe Types ───────────────────────────────────────────

export type StripeConnectionStatus = "connected" | "disconnected" | "revoked"

export interface StripeConnection {
  stripeUserId: string
  businessName: string
  email: string
  encryptedAccessToken: string
  encryptedRefreshToken: string | null
  scope: "read_write" | "read_only"
  livemode: boolean
  status: StripeConnectionStatus
  connectedAt: number
  updatedAt: number
}

export type StripeToolName =
  | "stripe.customers.list"
  | "stripe.customers.get"
  | "stripe.customers.create"
  | "stripe.charges.list"
  | "stripe.balance.get"
  | "stripe.balance.transactions"
  | "stripe.invoices.list"
  | "stripe.subscriptions.list"
  | "stripe.products.list"
  | "stripe.prices.list"
  | "stripe.payment_links.create"
  | "stripe.refunds.create"
  | "stripe.payouts.list"

export interface StripeToolResult {
  tool: StripeToolName
  ok: boolean
  data?: unknown
  error?: string
}

export interface StripeToolDefinition {
  name: StripeToolName
  description: string
  params: Record<string, { type: string; required: boolean; description: string }>
}

// ─── Vercel Types ───────────────────────────────────────────

export type VercelConnectionStatus = "connected" | "disconnected" | "uninstalled"

export interface VercelConnection {
  encryptedAccessToken: string
  teamId: string | null
  installationId: string
  configurationId: string | null
  username: string
  email: string
  status: VercelConnectionStatus
  connectedAt: number
  updatedAt: number
}

export type VercelToolName =
  | "vercel.projects.list"
  | "vercel.projects.get"
  | "vercel.deployments.list"
  | "vercel.deployments.get"
  | "vercel.deployments.create"
  | "vercel.deployments.cancel"
  | "vercel.deployments.promote"
  | "vercel.env.list"
  | "vercel.env.create"
  | "vercel.env.delete"
  | "vercel.domains.list"
  | "vercel.domains.add"
  | "vercel.domains.remove"

export interface VercelToolResult {
  tool: VercelToolName
  ok: boolean
  data?: unknown
  error?: string
}

export interface VercelToolDefinition {
  name: VercelToolName
  description: string
  params: Record<string, { type: string; required: boolean; description: string }>
}

// ─── Rclone Types ──────────────────────────────────────────

export type RcloneConnectionStatus = "connected" | "disconnected"

export interface RcloneRemote {
  name: string
  type: string
}

export interface RcloneConnection {
  rcloneVersion: string
  configPath: string
  remotes: RcloneRemote[]
  status: RcloneConnectionStatus
  connectedAt: number
  updatedAt: number
}

export type RcloneToolName =
  | "rclone.remotes.list"
  | "rclone.ls"
  | "rclone.lsjson"
  | "rclone.copy"
  | "rclone.move"
  | "rclone.delete"
  | "rclone.mkdir"
  | "rclone.rmdir"
  | "rclone.cat"
  | "rclone.about"
  | "rclone.sync"

export interface RcloneToolResult {
  tool: RcloneToolName
  ok: boolean
  data?: unknown
  error?: string
}

export interface RcloneToolDefinition {
  name: RcloneToolName
  description: string
  params: Record<string, { type: string; required: boolean; description: string }>
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
