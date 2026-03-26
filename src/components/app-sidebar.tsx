"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"

import { usePathname, useRouter } from "next/navigation"
import { NavDocuments } from "@/components/nav-documents"
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { getSessionMeta, ensureSessionMeta, clearSessionMessages } from "@/lib/session-store"
import {
  LayoutDashboardIcon,
  TargetIcon,
  UsersIcon,
  Settings2Icon,
  CircleHelpIcon,
  DatabaseIcon,
  FileChartColumnIcon,
  FileIcon,
  HashIcon,
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

const data = {
  user: {
    name: "xo",
    email: "admin@xo.dev",
    avatar: "",
  },
  orgNav: [
    { title: "Dashboard", url: "/", icon: <LayoutDashboardIcon /> },
    { title: "Agents", url: "/agents", icon: <UsersIcon /> },
    { title: "Objectives", url: "/objectives", icon: <TargetIcon /> },
  ],
  navSecondary: [
    { title: "Settings", url: "#", icon: <Settings2Icon /> },
    { title: "Get Help", url: "#", icon: <CircleHelpIcon /> },
  ],
  documents: [
    { name: "Storage", url: "/storage", icon: <DatabaseIcon /> },
    { name: "Reports", url: "/reports", icon: <FileChartColumnIcon /> },
    { name: "Docs", url: "/docs", icon: <FileIcon /> },
  ],
  channels: [
    { name: "general", url: "/channel/general", icon: <HashIcon /> },
    { name: "code-review", url: "/channel/code-review", icon: <HashIcon /> },
    { name: "design", url: "/channel/design", icon: <HashIcon /> },
    { name: "approvals", url: "/channel/approvals", icon: <HashIcon /> },
  ],
}

function getAgentNav(agentId: string) {
  return [
    { title: "Chat", url: `/agent/${agentId}/chat`, icon: <MessageSquareIcon /> },
    { title: "Dashboard", url: `/agent/${agentId}`, icon: <LayoutDashboardIcon /> },
    { title: "Objectives", url: `/agent/${agentId}/objectives`, icon: <TargetIcon /> },
  ]
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
    // Poll every 10s for session changes
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

// ─── Component ──────────────────────────────────────────────

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const isAgentMode = pathname.startsWith("/agent")
  const agentId = isAgentMode ? pathname.split("/")[2] : null
  const { sessions, createSession, deleteSession } = useBackendSessions()
  const tasks = useBackendTasks()

  // Get the default agent id for session chat links
  const defaultAgentId = agentId || "aria"

  const navItems = isAgentMode && agentId
    ? getAgentNav(agentId)
    : data.orgNav

  const activeTasks = tasks.filter((t) => t.status === "running" || t.status === "queued" || t.status === "pending")
  const completedTasks = tasks.filter((t) => t.status === "completed")

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <ContextSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />

        <NavDocuments items={data.documents} />

        {/* Channels */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Channels</SidebarGroupLabel>
          <SidebarMenu>
            {data.channels.slice(0, 3).map((ch) => (
              <SidebarMenuItem key={ch.name}>
                <SidebarMenuButton render={<a href={ch.url} />}>
                  {ch.icon}
                  <span>{ch.name}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {data.channels.length > 3 && (
              <SidebarMenuItem>
                <SidebarMenuButton className="text-sidebar-foreground/70">
                  <MoreHorizontalIcon className="text-sidebar-foreground/70" />
                  <span>More</span>
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
                  router.push(`/agent/${defaultAgentId}/chat?session=${id}`)
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
              const isActive = pathname.includes(`session=${sessionId}`)
              return (
                <SidebarMenuItem key={sessionId}>
                  <SidebarMenuButton
                    className={cn("h-auto py-1.5", isActive && "bg-sidebar-accent")}
                    render={
                      <a href={`/agent/${defaultAgentId}/chat?session=${sessionId}`} />
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
