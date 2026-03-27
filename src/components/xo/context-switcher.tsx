"use client"

import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { AGENTS, type AgentRole } from "@/lib/mock-data"
import { getMode, getAgentId } from "@/lib/mode"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarBadge } from "@/components/ui/avatar"
import { XOLogo } from "@/components/xo/logo"
import { ChevronsUpDownIcon } from "lucide-react"

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

const STATUS_DOT: Record<string, string> = {
  active: "bg-primary",
  idle: "bg-amber-400",
  offline: "bg-muted-foreground/30",
}

export function ContextSwitcher() {
  const pathname = usePathname()
  const router = useRouter()
  const xoMode = getMode()

  // In agent-only mode, show fixed agent identity without dropdown
  if (xoMode === "agent") {
    const fixedAgent = AGENTS.find((a) => a.id === getAgentId())
    if (!fixedAgent) {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[slot=sidebar-menu-button]:p-1.5!">
              <XOLogo size={20} />
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="text-sm font-semibold">XO Agent</span>
                <span className="text-xs text-muted-foreground">Standalone</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      )
    }

    const role = ROLE_STYLES[fixedAgent.role]
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" className="data-[slot=sidebar-menu-button]:p-1.5!">
            <Avatar className={cn("size-7 rounded-lg", role.bg)}>
              <AvatarFallback
                className={cn("rounded-lg text-[10px] font-bold tracking-wide", role.bg, role.text)}
              >
                {fixedAgent.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
              <AvatarBadge className={STATUS_DOT[fixedAgent.status]} />
            </Avatar>
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="text-sm font-semibold">{fixedAgent.name}</span>
              <span className={cn("text-xs", role.text)}>{fixedAgent.role}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // Org mode — full dropdown with org + agents
  const isAgentMode = pathname.startsWith("/agent")
  const currentAgentId = isAgentMode ? pathname.split("/")[2] : null
  const currentAgent = currentAgentId
    ? AGENTS.find((a) => a.id === currentAgentId)
    : null

  function handleSelectOrg() {
    router.push("/org")
  }

  function handleSelectAgent(agentId: string) {
    const subPage = pathname.split("/").slice(3).join("/") || "chat"
    router.push(`/agent/${agentId}/${subPage}`)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[slot=sidebar-menu-button]:p-1.5! aria-expanded:bg-sidebar-accent"
              />
            }
          >
            {isAgentMode && currentAgent ? (
              <>
                <Avatar className={cn("size-7 rounded-lg", ROLE_STYLES[currentAgent.role].bg)}>
                  <AvatarFallback
                    className={cn(
                      "rounded-lg text-[10px] font-bold tracking-wide",
                      ROLE_STYLES[currentAgent.role].bg,
                      ROLE_STYLES[currentAgent.role].text
                    )}
                  >
                    {currentAgent.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                  <AvatarBadge className={STATUS_DOT[currentAgent.status]} />
                </Avatar>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-sm font-semibold">{currentAgent.name}</span>
                  <span className={cn("text-xs", ROLE_STYLES[currentAgent.role].text)}>
                    {currentAgent.role}
                  </span>
                </div>
              </>
            ) : (
              <>
                <XOLogo size={20} />
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="text-sm font-semibold">XO Org</span>
                  <span className="text-xs text-muted-foreground">Workspace</span>
                </div>
              </>
            )}
            <ChevronsUpDownIcon className="ml-auto size-4 text-muted-foreground/50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Workspace
              </DropdownMenuLabel>
              <DropdownMenuItem
                className={cn(
                  "gap-2 p-2",
                  !isAgentMode && "bg-muted"
                )}
                onClick={handleSelectOrg}
              >
                <XOLogo size={16} />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-medium">XO Org</span>
                  <span className="text-xs text-muted-foreground">
                    {AGENTS.length} agents
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Agents
              </DropdownMenuLabel>
            {AGENTS.map((agent) => {
              const role = ROLE_STYLES[agent.role]
              const isActive = currentAgentId === agent.id

              return (
                <DropdownMenuItem
                  key={agent.id}
                  className={cn("gap-2 p-2", isActive && "bg-muted")}
                  onClick={() => handleSelectAgent(agent.id)}
                >
                  <Avatar className={cn("size-6 rounded-md", role.bg)}>
                    <AvatarFallback
                      className={cn(
                        "rounded-md text-[9px] font-bold",
                        role.bg, role.text
                      )}
                    >
                      {agent.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 items-center gap-2">
                    <span className="text-sm">{agent.name}</span>
                    <span className={cn("text-xs", role.text)}>{agent.role}</span>
                  </div>
                  <span
                    className={cn(
                      "size-1.5 rounded-full shrink-0",
                      STATUS_DOT[agent.status],
                      agent.status === "active" && "animate-pulse"
                    )}
                  />
                </DropdownMenuItem>
              )
            })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
