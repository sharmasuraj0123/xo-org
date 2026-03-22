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

export interface Agent {
  id: string
  name: string
  role: AgentRole
  status: AgentStatus
  model: string
  lastActive: string
  currentTask: string | null
  channels: string[]
  tasksCompleted: number
}

export const AGENTS: Agent[] = [
  {
    id: "aria",
    name: "Aria",
    role: "Research",
    status: "active",
    model: "claude-3.5-sonnet",
    lastActive: "just now",
    currentTask: "Analyzing competitor landscape for Q2 report",
    channels: ["general", "research"],
    tasksCompleted: 47,
  },
  {
    id: "rex",
    name: "Rex",
    role: "DevOps",
    status: "active",
    model: "gpt-4o",
    lastActive: "2m ago",
    currentTask: "Monitoring deployment pipeline for v2.3.1",
    channels: ["devops", "general"],
    tasksCompleted: 89,
  },
  {
    id: "nova",
    name: "Nova",
    role: "Engineering",
    status: "active",
    model: "claude-3.5-sonnet",
    lastActive: "5m ago",
    currentTask: "Code review: auth refactor PR #142",
    channels: ["code-review", "general"],
    tasksCompleted: 124,
  },
  {
    id: "sage",
    name: "Sage",
    role: "Product",
    status: "idle",
    model: "gpt-4o",
    lastActive: "18m ago",
    currentTask: null,
    channels: ["general", "design"],
    tasksCompleted: 63,
  },
  {
    id: "lux",
    name: "Lux",
    role: "Design",
    status: "idle",
    model: "claude-3-haiku",
    lastActive: "32m ago",
    currentTask: null,
    channels: ["design", "general"],
    tasksCompleted: 38,
  },
  {
    id: "echo",
    name: "Echo",
    role: "Support",
    status: "idle",
    model: "gpt-4o-mini",
    lastActive: "45m ago",
    currentTask: null,
    channels: ["general", "approvals"],
    tasksCompleted: 312,
  },
  {
    id: "axon",
    name: "Axon",
    role: "Analytics",
    status: "offline",
    model: "gpt-4o-mini",
    lastActive: "2h ago",
    currentTask: null,
    channels: ["general"],
    tasksCompleted: 201,
  },
  {
    id: "kira",
    name: "Kira",
    role: "Security",
    status: "offline",
    model: "claude-3.5-sonnet",
    lastActive: "3h ago",
    currentTask: null,
    channels: ["devops", "general"],
    tasksCompleted: 56,
  },
]
