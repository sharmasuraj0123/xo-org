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
  FolderIcon,
  FileIcon,
  FileTextIcon,
  FileCodeIcon,
  CommandIcon,
  MessageSquareIcon,
  CircleIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

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
}

function getAgentNav(agentId: string) {
  return [
    { title: "Chat", url: `/agent/${agentId}/chat`, icon: <MessageSquareIcon /> },
    { title: "Dashboard", url: `/agent/${agentId}`, icon: <LayoutDashboardIcon /> },
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

// ─── Component ──────────────────────────────────────────────

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()
  const isAgentMode = pathname.startsWith("/agent")
  const agentId = isAgentMode ? pathname.split("/")[2] : null
  const { sessions, createSession, deleteSession } = useBackendSessions()
  const workspaceEntries = useWorkspaceEntries()

  // Get the default agent id for session chat links
  const defaultAgentId = agentId || "aria"

  const navItems = isAgentMode && agentId
    ? getAgentNav(agentId)
    : data.orgNav

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <ContextSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />

        {/* Folders */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Folders</SidebarGroupLabel>
          <SidebarMenu>
            {workspaceEntries.map((entry) => {
              const Icon = getEntryIcon(entry)
              const url = entry.type === "folder"
                ? `/storage?path=${encodeURIComponent(entry.name)}`
                : `/storage`
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
