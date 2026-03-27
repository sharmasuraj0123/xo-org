import Link from "next/link"
import { AgentChart } from "@/components/agent-chart"
import { AgentDataTable } from "@/components/agent-data-table"
import { AgentSectionCards } from "@/components/agent-section-cards"
import { AgentTeamMembers } from "@/components/agent-team-members"
import { AgentChannels } from "@/components/agent-channels"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  BotIcon,
  UsersIcon,
  PlusIcon,
  ServerIcon,
  GlobeIcon,
  ClockIcon,
  ActivityIcon,
} from "lucide-react"

import data from "./data.json"

export default function AgentsPage() {
  return (
    <>
      <SiteHeader title="Agents" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Banner */}
            <div className="mx-4 rounded-xl bg-card ring-1 ring-foreground/5 lg:mx-6">
              {/* Top row: server info + action */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <ServerIcon className="size-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        XO Swarm Server
                      </span>
                      <Badge variant="default" className="text-[10px]">
                        Online
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <GlobeIcon className="size-3" />
                      <span className="font-mono">
                        api.xolabs.ai/v1/swarm
                      </span>
                    </div>
                  </div>
                </div>
                <Link href="/org/agents/connect">
                  <Button>
                    <PlusIcon className="size-4" />
                    Connect Agent
                  </Button>
                </Link>
              </div>

              <Separator />

              {/* Bottom row: stats */}
              <div className="flex items-center gap-6 px-6 py-3">
                <div className="flex items-center gap-2">
                  <BotIcon className="size-3.5 text-muted-foreground" />
                  <span className="text-sm tabular-nums font-medium">8</span>
                  <span className="text-xs text-muted-foreground">
                    Agents
                  </span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2">
                  <UsersIcon className="size-3.5 text-muted-foreground" />
                  <span className="text-sm tabular-nums font-medium">3</span>
                  <span className="text-xs text-muted-foreground">
                    Humans
                  </span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2">
                  <ActivityIcon className="size-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Uptime
                  </span>
                  <span className="text-sm tabular-nums font-medium">
                    99.8%
                  </span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-2">
                  <ClockIcon className="size-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Last deploy
                  </span>
                  <span className="text-xs font-medium">2h ago</span>
                </div>
              </div>
            </div>

            <AgentSectionCards />
            <div className="px-4 lg:px-6">
              <AgentChart />
            </div>
            <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2">
              <AgentTeamMembers />
              <AgentChannels />
            </div>
            <AgentDataTable data={data} />
          </div>
        </div>
      </div>
    </>
  )
}
