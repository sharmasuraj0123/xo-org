"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"

import { usePathname, useRouter } from "next/navigation"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { ContextSwitcher } from "@/components/xo/context-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { getSessionMeta, ensureSessionMeta, clearSessionMessages } from "@/lib/session-store"
import { getMode, getAgentId } from "@/lib/mode"
import {
  LayoutDashboardIcon,
  TargetIcon,
  UsersIcon,
  Settings2Icon,
  CircleHelpIcon,
  FolderIcon,
  FileIcon,
  FileTextIcon,
  FileCodeIcon,
  MoreHorizontalIcon,
  CommandIcon,
  MessageSquareIcon,
  CircleDotIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  LoaderIcon,
  XCircleIcon,
  PlusIcon,
  Trash2Icon,
  SquareIcon,
  HardDriveIcon,
  FileChartColumnIcon,
  BookOpenIcon,
} from "lucide-react"

// ─── Backend task type ──────────────────────────────────────
type BackendTask = {
  task_id: string
  status: string
  prompt: string
  cwd: string | null
  created_at: number
  started_at: number | null
  completed_at: number | null
  result_text: string
  error: string | null
  cost_usd: number | null
  duration_ms: number | null
}

const TASK_STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <CircleIcon className="size-3 text-muted-foreground/50" />,
  queued: <CircleDotIcon className="size-3 text-blue-400/70" />,
  running: <LoaderIcon className="size-3 text-primary animate-spin" />,
  completed: <CheckCircle2Icon className="size-3 text-primary/60" />,
  failed: <XCircleIcon className="size-3 text-red-400" />,
  stopped: <SquareIcon className="size-3 text-amber-400" />,
}

const mode = getMode()

const orgNav = [
  { title: "Dashboard", url: "/org", icon: <LayoutDashboardIcon /> },
  { title: "Agents", url: "/org/agents", icon: <UsersIcon /> },
  { title: "Objectives", url: "/org/objectives", icon: <TargetIcon /> },
]

const agentSoloNav = [
  { title: "Chat", url: "/agent/chat", icon: <MessageSquareIcon /> },
  { title: "Dashboard", url: "/agent", icon: <LayoutDashboardIcon /> },
]

function getAgentDetailNav(agentId: string) {
  return [
    { title: "Chat", url: `/agent/${agentId}/chat`, icon: <MessageSquareIcon /> },
    { title: "Dashboard", url: `/agent/${agentId}`, icon: <LayoutDashboardIcon /> },
    { title: "Objectives", url: `/agent/${agentId}/objectives`, icon: <TargetIcon /> },
  ]
}

const data = {
  user: {
    name: "xo",
    email: "admin@xo.dev",
    avatar: "",
  },
  navSecondary: [
    { title: "Settings", url: "#", icon: <Settings2Icon /> },
    { title: "Get Help", url: "#", icon: <CircleHelpIcon /> },
  ],
}

// ─── Backend hooks ──────────────────────────────────────────

function useBackendSessions() {
  const [sessions, setSessions] = useState<string[]>([])

  const refresh = useCallback(() => {
    fetch("/api/proxy?path=/sessions")
      .then((r) => r.json())
      .then((data) => {
        if (data.sessions) setSessions(data.sessions)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 10000)
    return () => clearInterval(interval)
  }, [refresh])

  const createSession = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy?path=/sessions", { method: "POST" })
      const data = await res.json()
      if (data.session_id) {
        refresh()
        return data.session_id
      }
    } catch {}
    return null
  }, [refresh])

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await fetch(`/api/proxy?path=/sessions/${sessionId}`, { method: "DELETE" })
      refresh()
    } catch {}
  }, [refresh])

  return { sessions, createSession, deleteSession, refresh }
}

function useBackendTasks() {
  const [tasks, setTasks] = useState<BackendTask[]>([])

  useEffect(() => {
    function fetchTasks() {
      fetch("/api/proxy?path=/tasks")
        .then((r) => r.json())
        .then((data) => {
          if (data.tasks) setTasks(data.tasks)
        })
        .catch(() => {})
    }

    fetchTasks()
    const interval = setInterval(fetchTasks, 5000)
    return () => clearInterval(interval)
  }, [])

  return tasks
}

function formatDuration(ms: number | null): string {
  if (!ms) return ""
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function truncatePrompt(prompt: string, max = 40): string {
  if (prompt.length <= max) return prompt
  return prompt.slice(0, max) + "…"
}

// ─── Workspace folder entries ────────────────────────────────

type FSEntry = {
  name: string
  type: "folder" | "file"
  extension: string
}

function getEntryIcon(entry: FSEntry) {
  if (entry.type === "folder") return FolderIcon
  switch (entry.extension) {
    case "md":
    case "txt":
    case "pdf":
      return FileTextIcon
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "py":
    case "json":
    case "yml":
    case "yaml":
    case "toml":
      return FileCodeIcon
    default:
      return FileIcon
  }
}

function useWorkspaceEntries() {
  const [entries, setEntries] = useState<FSEntry[]>([])

  useEffect(() => {
    fetch("/api/storage?path=")
      .then((r) => r.json())
      .then((data) => {
        if (data.entries) setEntries(data.entries)
      })
      .catch(() => {})
  }, [])

  return entries
}

// ─── Determine sidebar mode ─────────────────────────────────

type SidebarMode = "org" | "agent-solo" | "agent-detail"

function useSidebarMode(): { sidebarMode: SidebarMode; agentId: string | null } {
  const pathname = usePathname()
  const isOnAgentRoute = pathname.startsWith("/agent")

  if (mode === "agent") {
    // Agent-only deployment — always solo mode
    return { sidebarMode: "agent-solo", agentId: getAgentId() }
  }

  // Org mode — check if we're viewing a specific agent
  if (isOnAgentRoute) {
    // Extract agent ID from /agent/[id]/... pattern
    const segments = pathname.split("/")
    const potentialId = segments[2]
    // If there's an ID segment and it's not a solo route keyword
    if (potentialId && !["chat", "objectives", "storage", "reports", "docs"].includes(potentialId)) {
      return { sidebarMode: "agent-detail", agentId: potentialId }
    }
  }

  return { sidebarMode: "org", agentId: null }
}

// ─── Component ──────────────────────────────────────────────

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter()
  const { sidebarMode, agentId } = useSidebarMode()
  const { sessions, createSession, deleteSession } = useBackendSessions()
  const tasks = useBackendTasks()
  const workspaceEntries = useWorkspaceEntries()

  const defaultAgentId = agentId || getAgentId()

  // Build nav items based on mode
  let navItems
  if (sidebarMode === "agent-detail" && agentId) {
    navItems = getAgentDetailNav(agentId)
  } else if (sidebarMode === "agent-solo") {
    navItems = agentSoloNav
  } else {
    navItems = orgNav
  }

  // Build session chat link based on mode
  const sessionChatUrl = (sessionId: string) => {
    if (sidebarMode === "agent-solo") {
      return `/agent/chat?session=${sessionId}`
    }
    return `/agent/${defaultAgentId}/chat?session=${sessionId}`
  }

  // Build storage link based on mode
  const storagePath = (entryName: string) => {
    if (sidebarMode === "agent-solo") {
      return `/agent/storage?path=${encodeURIComponent(entryName)}`
    }
    return `/org/storage?path=${encodeURIComponent(entryName)}`
  }

  const activeTasks = tasks.filter((t) => t.status === "running" || t.status === "queued" || t.status === "pending")
  const completedTasks = tasks.filter((t) => t.status === "completed")

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent>
        <ContextSwitcher />
        <NavMain items={navItems} />

        {/* Folders */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Folders</SidebarGroupLabel>
          <SidebarMenu>
            {workspaceEntries.map((entry) => {
              const Icon = getEntryIcon(entry)
              const url = entry.type === "folder"
                ? storagePath(entry.name)
                : sidebarMode === "agent-solo" ? "/agent/storage" : "/org/storage"
              return (
                <SidebarMenuItem key={entry.name}>
                  <SidebarMenuButton render={<a href={url} />}>
                    <Icon className="size-4" />
                    <span>{entry.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
            {workspaceEntries.length === 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sidebar-foreground/40" disabled>
                  <FolderIcon className="size-3 text-sidebar-foreground/30" />
                  <span className="text-xs">Empty workspace</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        {/* Sessions */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="flex items-center">
            Sessions
            <button
              onClick={async () => {
                const id = await createSession()
                if (id) {
                  ensureSessionMeta(id)
                  router.push(sessionChatUrl(id))
                }
              }}
              className="ml-auto flex size-5 items-center justify-center rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="New session"
            >
              <PlusIcon className="size-3.5" />
            </button>
          </SidebarGroupLabel>
          <SidebarMenu>
            {sessions.length === 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sidebar-foreground/40" disabled>
                  <CircleIcon className="size-3 text-sidebar-foreground/30" />
                  <span className="text-xs">No active sessions</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {sessions.map((sessionId) => {
              const meta = getSessionMeta(sessionId)
              const title = meta?.title || "New session"
              return (
                <SidebarMenuItem key={sessionId}>
                  <SidebarMenuButton
                    className="h-auto py-1.5"
                    render={
                      <a href={sessionChatUrl(sessionId)} />
                    }
                  >
                    <MessageSquareIcon className="size-3 text-primary shrink-0" />
                    <div className="flex flex-col min-w-0 gap-0">
                      <span className="truncate text-xs leading-tight">{title}</span>
                      <span className="text-[10px] text-muted-foreground/40 font-mono truncate">
                        {sessionId.slice(0, 8)}
                      </span>
                    </div>
                  </SidebarMenuButton>
                  <SidebarMenuAction
                    showOnHover
                    onClick={() => {
                      deleteSession(sessionId)
                      clearSessionMessages(sessionId)
                    }}
                    className="text-sidebar-foreground/40 hover:text-destructive"
                  >
                    <Trash2Icon className="size-3" />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Tasks */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>
            Tasks
            {tasks.length > 0 && (
              <span className="ml-auto text-[10px] text-muted-foreground/50 tabular-nums">
                {activeTasks.length} active · {completedTasks.length} done
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarMenu>
            {tasks.length === 0 && (
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sidebar-foreground/40" disabled>
                  <CircleIcon className="size-3 text-sidebar-foreground/30" />
                  <span className="text-xs">No tasks</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            {tasks.slice(0, 6).map((task) => (
              <SidebarMenuItem key={task.task_id}>
                <SidebarMenuButton className="h-auto py-1.5" title={task.prompt}>
                  <span className="shrink-0 mt-0.5">
                    {TASK_STATUS_ICON[task.status] ?? TASK_STATUS_ICON.pending}
                  </span>
                  <div className="flex flex-col min-w-0 gap-0.5">
                    <span className="truncate text-xs leading-tight">
                      {truncatePrompt(task.prompt)}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 tabular-nums">
                      {task.status}
                      {task.duration_ms ? ` · ${formatDuration(task.duration_ms)}` : ""}
                      {task.cost_usd ? ` · $${task.cost_usd.toFixed(2)}` : ""}
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {tasks.length > 6 && (
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sidebar-foreground/70">
                  <MoreHorizontalIcon className="text-sidebar-foreground/70" />
                  <span className="text-xs">View all {tasks.length} tasks</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>

        <NavSecondary items={data.navSecondary} className="mt-auto" />
        <SidebarGroup className="group-data-[collapsible=icon]:hidden px-2 pb-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-sidebar-foreground/50 hover:text-sidebar-foreground/70"
                tooltip="Command Palette"
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', code: 'KeyK', metaKey: true, bubbles: true }))}
              >
                <CommandIcon className="size-4" />
                <span>Command</span>
                <kbd className="ml-auto inline-flex h-5 items-center gap-0.5 rounded border border-sidebar-border bg-sidebar-accent px-1.5 text-[10px] font-medium text-sidebar-foreground/50">
                  ⌘K
                </kbd>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
