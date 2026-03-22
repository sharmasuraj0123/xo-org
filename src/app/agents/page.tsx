import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { AgentNetworkClient } from "@/components/xo/agent-network-client"
import { AGENTS } from "@/lib/mock-data"
import { ActivityIcon } from "lucide-react"

const ROLE_AVATAR_BG: Record<string, string> = {
  Research:    "bg-blue-500/20 text-blue-400",
  Engineering: "bg-primary/20 text-primary",
  DevOps:      "bg-orange-400/20 text-orange-400",
  Design:      "bg-purple-400/20 text-purple-400",
  Product:     "bg-cyan-400/20 text-cyan-400",
  Analytics:   "bg-yellow-400/20 text-yellow-400",
  Security:    "bg-red-400/20 text-red-400",
  Support:     "bg-teal-400/20 text-teal-400",
}

export default function AgentsPage() {
  const activeAgents = AGENTS.filter((a) => a.status === "active")
  const idleCount = AGENTS.filter((a) => a.status === "idle").length
  const offlineCount = AGENTS.filter((a) => a.status === "offline").length
  const tasksRunning = AGENTS.filter((a) => a.currentTask !== null).length
  const allChannels = [...new Set(AGENTS.flatMap((a) => a.channels))]

  const avatarPreview = activeAgents.slice(0, 3)
  const overflowCount = activeAgents.length - avatarPreview.length

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Agents" />

        <div className="flex flex-1 flex-col p-4 md:p-6 gap-8">

          {/* Page header */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-semibold tracking-tight">Agent Network</h2>
              <p className="text-sm text-muted-foreground">
                Real-time view of all agents connected to this organization
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

              {/* Active — with avatar group */}
              <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</span>
                  <span className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs text-primary font-medium">live</span>
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold tabular-nums text-primary leading-none">
                    {activeAgents.length}
                  </span>
                  <AvatarGroup>
                    {avatarPreview.map((a) => (
                      <Avatar key={a.id} size="sm" className={ROLE_AVATAR_BG[a.role]}>
                        <AvatarFallback className={`text-[10px] font-bold ${ROLE_AVATAR_BG[a.role]}`}>
                          {a.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {overflowCount > 0 && (
                      <AvatarGroupCount className="size-6 text-[10px]">
                        +{overflowCount}
                      </AvatarGroupCount>
                    )}
                  </AvatarGroup>
                </div>
              </div>

              {/* Idle */}
              <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Idle</span>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold tabular-nums leading-none">{idleCount}</span>
                  <span className="size-2 rounded-full bg-amber-400/70 mb-1" />
                </div>
              </div>

              {/* Tasks running */}
              <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tasks</span>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold tabular-nums leading-none">{tasksRunning}</span>
                  <ActivityIcon className="size-4 text-muted-foreground/50 mb-0.5" />
                </div>
              </div>

              {/* Channels */}
              <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/5">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Channels</span>
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold tabular-nums leading-none">{allChannels.length}</span>
                  <div className="flex flex-col gap-0.5 mb-0.5">
                    {allChannels.slice(0, 3).map((ch) => (
                      <div key={ch} className="h-0.5 rounded-full bg-muted-foreground/20 w-8" />
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          <Separator className="opacity-50" />

          {/* Agent tabs + grid */}
          <AgentNetworkClient agents={AGENTS} />

        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
