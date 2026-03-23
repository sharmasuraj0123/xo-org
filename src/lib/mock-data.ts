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

// ─── Skill & Artifact Types ────────────────────────────────
export interface ThreadSkill {
  id: string
  name: string
  description: string
  icon: string
}

export interface ThreadArtifact {
  id: string
  name: string
  type: "code" | "document" | "image" | "data"
  addedBy: string
  addedAt: string
}

// ─── Objective & Key Result Types ───────────────────────────
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
  proposedAt: string
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
  createdAt: string
  lastActivity: string
  keyResults: KeyResult[]
  skills: ThreadSkill[]
  artifacts: ThreadArtifact[]
  instructions: string
  parentMessageId?: string
}

// ─── Skills Catalog ─────────────────────────────────────────
export const THREAD_SKILLS: ThreadSkill[] = [
  { id: "web-search", name: "Web Search", description: "Search the web for real-time information", icon: "Globe" },
  { id: "code-exec", name: "Code Execution", description: "Run code snippets in a sandboxed environment", icon: "Terminal" },
  { id: "file-analysis", name: "File Analysis", description: "Parse and analyze uploaded files", icon: "FileSearch" },
  { id: "data-viz", name: "Data Visualization", description: "Generate charts and graphs from data", icon: "BarChart3" },
  { id: "summarize", name: "Summarization", description: "Condense long documents into key points", icon: "FileText" },
  { id: "translate", name: "Translation", description: "Translate text between languages", icon: "Languages" },
  { id: "code-review", name: "Code Review", description: "Analyze code for bugs and improvements", icon: "GitPullRequest" },
  { id: "image-gen", name: "Image Generation", description: "Create images from text descriptions", icon: "Image" },
]

// ─── Agents ─────────────────────────────────────────────────
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

// ─── Objectives ─────────────────────────────────────────────
export const OBJECTIVES: Objective[] = [
  {
    id: "obj-1",
    channelId: "code-review",
    title: "Accelerate product delivery pipeline",
    humanOwner: "xo",
    humanOwnerInitials: "XO",
    aiOwner: "nova",
    status: "On Track",
    progress: 93,
    timePeriod: "Q1 2026",
    createdAt: "2w ago",
    lastActivity: "5m ago",
    keyResults: [
      {
        id: "kr-1",
        objectiveId: "obj-1",
        title: "Reduce CI/CD pipeline time from 45min to under 15min",
        status: "approved",
        current: "22",
        target: "15",
        unit: "min",
        confidence: 5,
        progress: 53,
        proposedBy: "nova",
        approvedBy: "xo",
        proposedAt: "2w ago",
        owner: "Nova",
        ownerInitials: "NV",
      },
      {
        id: "kr-2",
        objectiveId: "obj-1",
        title: "Increase deployment frequency to 3x per day",
        status: "approved",
        current: "2.4",
        target: "3",
        unit: "deploys/day",
        confidence: 8,
        progress: 80,
        proposedBy: "nova",
        approvedBy: "xo",
        proposedAt: "2w ago",
        owner: "Rex",
        ownerInitials: "RX",
      },
      {
        id: "kr-3",
        objectiveId: "obj-1",
        title: "Achieve 99.5% deployment success rate",
        status: "completed",
        current: "99.2",
        target: "99.5",
        unit: "%",
        confidence: 9,
        progress: 99,
        proposedBy: "nova",
        approvedBy: "xo",
        proposedAt: "2w ago",
        owner: "Rex",
        ownerInitials: "RX",
      },
    ],
    skills: [THREAD_SKILLS[6], THREAD_SKILLS[1]],
    artifacts: [
      { id: "art-1", name: "pipeline-config.yml", type: "code", addedBy: "Nova", addedAt: "1w ago" },
    ],
    instructions: "Optimize the CI/CD pipeline for speed and reliability. Focus on parallelization and caching strategies.",
  },
  {
    id: "obj-2",
    channelId: "general",
    title: "Improve platform reliability and performance",
    humanOwner: "xo",
    humanOwnerInitials: "XO",
    aiOwner: "aria",
    status: "At Risk",
    progress: 68,
    timePeriod: "Q1 2026",
    createdAt: "3w ago",
    lastActivity: "20m ago",
    keyResults: [
      {
        id: "kr-4",
        objectiveId: "obj-2",
        title: "Reduce p95 API latency from 420ms to under 200ms",
        status: "approved",
        current: "310",
        target: "200",
        unit: "ms",
        confidence: 3,
        progress: 50,
        proposedBy: "aria",
        approvedBy: "xo",
        proposedAt: "3w ago",
        owner: "Nova",
        ownerInitials: "NV",
      },
      {
        id: "kr-5",
        objectiveId: "obj-2",
        title: "Achieve 99.9% uptime SLA",
        status: "approved",
        current: "99.7",
        target: "99.9",
        unit: "%",
        confidence: 5,
        progress: 85,
        proposedBy: "aria",
        approvedBy: "xo",
        proposedAt: "3w ago",
        owner: "Rex",
        ownerInitials: "RX",
      },
      {
        id: "kr-6",
        objectiveId: "obj-2",
        title: "Reduce error rate from 2.1% to under 0.5%",
        status: "approved",
        current: "1.2",
        target: "0.5",
        unit: "%",
        confidence: 4,
        progress: 56,
        proposedBy: "aria",
        approvedBy: "xo",
        proposedAt: "3w ago",
        owner: "Kira",
        ownerInitials: "KI",
      },
      {
        id: "kr-7",
        objectiveId: "obj-2",
        title: "Implement automated failover for all critical services",
        status: "proposed",
        current: "0",
        target: "5",
        unit: "services",
        confidence: 6,
        progress: 0,
        proposedBy: "aria",
        proposedAt: "10m ago",
        owner: "Rex",
        ownerInitials: "RX",
      },
    ],
    skills: [THREAD_SKILLS[0], THREAD_SKILLS[4]],
    artifacts: [
      { id: "art-2", name: "performance-report.md", type: "document", addedBy: "Aria", addedAt: "1d ago" },
      { id: "art-3", name: "latency-analysis.csv", type: "data", addedBy: "Aria", addedAt: "45m ago" },
    ],
    instructions: "Focus on identifying key performance bottlenecks. Prioritize items by user impact. All recommendations should include estimated effort.",
  },
  {
    id: "obj-3",
    channelId: "design",
    title: "Establish design system v2",
    humanOwner: "xo",
    humanOwnerInitials: "XO",
    aiOwner: "lux",
    status: "Not Started",
    progress: 0,
    timePeriod: "Q1 2026",
    createdAt: "1w ago",
    lastActivity: "3h ago",
    keyResults: [
      {
        id: "kr-8",
        objectiveId: "obj-3",
        title: "Audit and document all 48 existing components",
        status: "proposed",
        current: "0",
        target: "48",
        unit: "components",
        confidence: 5,
        progress: 0,
        proposedBy: "lux",
        proposedAt: "3h ago",
        owner: "Lux",
        ownerInitials: "LX",
      },
      {
        id: "kr-9",
        objectiveId: "obj-3",
        title: "Migrate 100% of pages to new token system",
        status: "proposed",
        current: "0",
        target: "100",
        unit: "%",
        confidence: 5,
        progress: 0,
        proposedBy: "lux",
        proposedAt: "3h ago",
        owner: "Nova",
        ownerInitials: "NV",
      },
    ],
    skills: [THREAD_SKILLS[7], THREAD_SKILLS[4]],
    artifacts: [
      { id: "art-4", name: "design-tokens.json", type: "code", addedBy: "Lux", addedAt: "6h ago" },
    ],
    instructions: "Design a streamlined component library. Target: reduce design-to-code time by 50%.",
  },
  {
    id: "obj-4",
    channelId: "general",
    title: "Onboard and validate QA agent pipeline",
    humanOwner: "xo",
    humanOwnerInitials: "XO",
    aiOwner: "echo",
    status: "Completed",
    progress: 100,
    timePeriod: "Q1 2026",
    createdAt: "1mo ago",
    lastActivity: "2d ago",
    keyResults: [
      {
        id: "kr-10",
        objectiveId: "obj-4",
        title: "Configure agent permissions across all channels",
        status: "completed",
        current: "5",
        target: "5",
        unit: "channels",
        confidence: 10,
        progress: 100,
        proposedBy: "echo",
        approvedBy: "xo",
        proposedAt: "1mo ago",
        owner: "Echo",
        ownerInitials: "EC",
      },
      {
        id: "kr-11",
        objectiveId: "obj-4",
        title: "Pass baseline regression suite with 100% coverage",
        status: "completed",
        current: "100",
        target: "100",
        unit: "%",
        confidence: 10,
        progress: 100,
        proposedBy: "echo",
        approvedBy: "xo",
        proposedAt: "1mo ago",
        owner: "Echo",
        ownerInitials: "EC",
      },
      {
        id: "kr-12",
        objectiveId: "obj-4",
        title: "Process 500 test cases in first validation run",
        status: "completed",
        current: "512",
        target: "500",
        unit: "cases",
        confidence: 10,
        progress: 100,
        proposedBy: "echo",
        approvedBy: "xo",
        proposedAt: "1mo ago",
        owner: "Aria",
        ownerInitials: "AR",
      },
    ],
    skills: [THREAD_SKILLS[2]],
    artifacts: [],
    instructions: "Follow standard QA onboarding procedure. Validate all agents have correct permissions.",
  },
  {
    id: "obj-5",
    channelId: "devops",
    title: "v2.3.1 Deployment Checklist",
    humanOwner: "xo",
    humanOwnerInitials: "XO",
    aiOwner: "rex",
    status: "On Track",
    progress: 65,
    timePeriod: "Q1 2026",
    createdAt: "30m ago",
    lastActivity: "5m ago",
    keyResults: [
      {
        id: "kr-13",
        objectiveId: "obj-5",
        title: "Complete pre-deployment smoke tests",
        status: "approved",
        current: "3",
        target: "5",
        unit: "stages",
        confidence: 7,
        progress: 60,
        proposedBy: "rex",
        approvedBy: "xo",
        proposedAt: "25m ago",
        owner: "Rex",
        ownerInitials: "RX",
      },
      {
        id: "kr-14",
        objectiveId: "obj-5",
        title: "Maintain error rate below 0.5% during rollout",
        status: "proposed",
        current: "0.1",
        target: "0.5",
        unit: "%",
        confidence: 8,
        progress: 80,
        proposedBy: "rex",
        proposedAt: "10m ago",
        owner: "Kira",
        ownerInitials: "KI",
      },
    ],
    skills: [THREAD_SKILLS[1]],
    artifacts: [],
    instructions: "Follow standard deployment procedure. Run smoke tests after each stage. Rollback if error rate exceeds 0.5%.",
  },
]

// ─── OKR Row Conversion Helper ──────────────────────────────
export interface OKRRow {
  id: number
  header: string
  type: string
  status: string
  progress: string
  current: string
  target: string
  unit: string
  confidence: string
  owner: string
  ownerInitials: string
  timePeriod: string
  channel?: string
  parentObjective?: string
  aiOwner?: string
  humanOwner?: string
}

let _rowId = 0
export function objectivesToOKRRows(objectives: Objective[]): OKRRow[] {
  _rowId = 0
  const rows: OKRRow[] = []
  for (const obj of objectives) {
    _rowId++
    const aiAgent = AGENTS.find((a) => a.id === obj.aiOwner)
    rows.push({
      id: _rowId,
      header: obj.title,
      type: "Objective",
      status: obj.status,
      progress: String(obj.progress),
      current: "",
      target: "",
      unit: "",
      confidence: String(Math.round(obj.keyResults.reduce((sum, kr) => sum + kr.confidence, 0) / Math.max(obj.keyResults.length, 1))),
      owner: obj.humanOwner,
      ownerInitials: obj.humanOwnerInitials,
      timePeriod: obj.timePeriod,
      channel: obj.channelId,
      aiOwner: aiAgent?.name,
      humanOwner: obj.humanOwner,
    })
    for (const kr of obj.keyResults) {
      if (kr.status === "rejected") continue
      _rowId++
      rows.push({
        id: _rowId,
        header: kr.title,
        type: "Key Result",
        status: kr.status === "completed" ? "Completed" : kr.status === "proposed" ? "Not Started" : obj.status,
        progress: String(kr.progress),
        current: kr.current,
        target: kr.target,
        unit: kr.unit,
        confidence: String(kr.confidence),
        owner: kr.owner,
        ownerInitials: kr.ownerInitials,
        timePeriod: obj.timePeriod,
        parentObjective: obj.title,
      })
    }
  }
  return rows
}
