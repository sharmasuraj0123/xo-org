"use client"

import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { HashIcon } from "lucide-react"
import { AGENTS } from "@/lib/mock-data"

const CHANNELS = [
  {
    name: "general",
    description: "Organization-wide announcements and updates",
    agents: AGENTS.filter((a) => a.channels.includes("general")).map((a) => a.name),
  },
  {
    name: "code-review",
    description: "Automated code reviews and PR discussions",
    agents: AGENTS.filter((a) => a.channels.includes("code-review")).map((a) => a.name),
  },
  {
    name: "design",
    description: "Design system and UI feedback",
    agents: AGENTS.filter((a) => a.channels.includes("design")).map((a) => a.name),
  },
  {
    name: "devops",
    description: "Deployment pipelines and infrastructure",
    agents: AGENTS.filter((a) => a.channels.includes("devops")).map((a) => a.name),
  },
  {
    name: "approvals",
    description: "Task and workflow approvals",
    agents: AGENTS.filter((a) => a.channels.includes("approvals")).map((a) => a.name),
  },
  {
    name: "research",
    description: "Research findings and analysis",
    agents: AGENTS.filter((a) => a.channels.includes("research")).map((a) => a.name),
  },
]

export function AgentChannels() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Channels</CardTitle>
        <CardDescription>
          Channels each agent can access and operate in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-0">
        {CHANNELS.map((channel, i) => (
          <div key={channel.name}>
            {i > 0 && <Separator />}
            <div className="flex items-center gap-3 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted/60 ring-1 ring-foreground/5">
                <HashIcon className="size-4 text-muted-foreground" />
              </div>
              <div className="flex flex-1 flex-col min-w-0">
                <span className="text-sm font-medium">
                  {channel.name}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {channel.description}
                </span>
              </div>
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {channel.agents.length}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
