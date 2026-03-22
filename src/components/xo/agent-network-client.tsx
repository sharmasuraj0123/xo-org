"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AgentCard } from "@/components/xo/agent-card"
import type { Agent } from "@/lib/mock-data"

interface AgentNetworkClientProps {
  agents: Agent[]
}

function AgentGrid({ agents }: { agents: Agent[] }) {
  if (agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No agents in this state
      </div>
    )
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  )
}

function TabCount({ count }: { count: number }) {
  return (
    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-muted-foreground group-data-active:bg-background/60">
      {count}
    </span>
  )
}

export function AgentNetworkClient({ agents }: AgentNetworkClientProps) {
  const active = agents.filter((a) => a.status === "active")
  const idle = agents.filter((a) => a.status === "idle")
  const offline = agents.filter((a) => a.status === "offline")

  return (
    <Tabs defaultValue="all" className="gap-4">
      <TabsList className="h-9 px-1">
        <TabsTrigger value="all" className="group text-xs px-3">
          All <TabCount count={agents.length} />
        </TabsTrigger>
        <TabsTrigger value="active" className="group text-xs px-3">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Active
          </span>
          <TabCount count={active.length} />
        </TabsTrigger>
        <TabsTrigger value="idle" className="group text-xs px-3">
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-amber-400" />
            Idle
          </span>
          <TabCount count={idle.length} />
        </TabsTrigger>
        <TabsTrigger value="offline" className="group text-xs px-3">
          Offline <TabCount count={offline.length} />
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all">
        <AgentGrid agents={agents} />
      </TabsContent>
      <TabsContent value="active">
        <AgentGrid agents={active} />
      </TabsContent>
      <TabsContent value="idle">
        <AgentGrid agents={idle} />
      </TabsContent>
      <TabsContent value="offline">
        <AgentGrid agents={offline} />
      </TabsContent>
    </Tabs>
  )
}
