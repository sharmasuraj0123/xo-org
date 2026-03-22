import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarBadge } from "@/components/ui/avatar"
import { CpuIcon, HashIcon } from "lucide-react"
import type { Agent, AgentRole } from "@/lib/mock-data"

const ROLE_STYLES: Record<AgentRole, { bg: string; text: string }> = {
  Research:    { bg: "bg-blue-500/20",   text: "text-blue-400" },
  Engineering: { bg: "bg-primary/20",    text: "text-primary" },
  DevOps:      { bg: "bg-orange-400/20", text: "text-orange-400" },
  Design:      { bg: "bg-purple-400/20", text: "text-purple-400" },
  Product:     { bg: "bg-cyan-400/20",   text: "text-cyan-400" },
  Analytics:   { bg: "bg-yellow-400/20", text: "text-yellow-400" },
  Security:    { bg: "bg-red-400/20",    text: "text-red-400" },
  Support:     { bg: "bg-teal-400/20",   text: "text-teal-400" },
}

const STATUS_TOP: Record<Agent["status"], string> = {
  active:  "bg-primary",
  idle:    "bg-amber-400/70",
  offline: "bg-border",
}

const STATUS_PILL: Record<Agent["status"], string> = {
  active:  "bg-primary/10 text-primary border border-primary/20",
  idle:    "bg-amber-400/10 text-amber-400 border border-amber-400/20",
  offline: "bg-muted/60 text-muted-foreground/60 border border-border",
}

const STATUS_BADGE: Record<Agent["status"], string> = {
  active:  "bg-primary",
  idle:    "bg-amber-400",
  offline: "bg-muted-foreground/30",
}

export function AgentCard({ agent }: { agent: Agent }) {
  const role = ROLE_STYLES[agent.role]
  const initials = agent.name.slice(0, 2).toUpperCase()

  return (
    <Card
      className={cn(
        "overflow-hidden p-0 gap-0 transition-all duration-200",
        agent.status === "offline" && "opacity-50",
        agent.status === "active" && "shadow-[0_0_0_1px_oklch(0.68_0.14_145/0.2)]",
      )}
    >
      {/* Top accent line */}
      <div className={cn("h-[3px] w-full shrink-0", STATUS_TOP[agent.status])} />

      <div className="p-4 flex flex-col gap-4">
        {/* Header: avatar + name + status pill */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className={cn("size-10", role.bg)}>
              <AvatarFallback
                className={cn("text-xs font-bold tracking-wide", role.bg, role.text)}
              >
                {initials}
              </AvatarFallback>
              <AvatarBadge className={STATUS_BADGE[agent.status]} />
            </Avatar>
            <div>
              <div className="text-sm font-semibold leading-tight">{agent.name}</div>
              <div className={cn("text-xs font-medium mt-0.5", role.text)}>
                {agent.role}
              </div>
            </div>
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0",
              STATUS_PILL[agent.status],
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full shrink-0",
                STATUS_BADGE[agent.status],
                agent.status === "active" && "animate-pulse",
              )}
            />
            {agent.status}
          </div>
        </div>

        {/* Model */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
          <CpuIcon className="size-3 shrink-0" />
          <span className="font-mono">{agent.model}</span>
        </div>

        {/* Task */}
        <div className="min-h-[2.5rem] flex items-start">
          {agent.currentTask ? (
            <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
              {agent.currentTask}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/40 italic">No active task</p>
          )}
        </div>

        {/* Footer: channels + task count */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            {agent.channels.map((ch) => (
              <span
                key={ch}
                className="inline-flex items-center gap-0.5 rounded-md bg-muted/80 px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <HashIcon className="size-2.5 shrink-0" />
                {ch}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1 shrink-0 text-xs text-muted-foreground/60">
            <span className="tabular-nums font-medium text-foreground/70">{agent.tasksCompleted}</span>
            <span>done</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
