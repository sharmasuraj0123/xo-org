"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  GithubIcon,
  MessageCircleIcon,
  SendIcon,
  SlackIcon,
  MailIcon,
  GlobeIcon,
} from "lucide-react"

interface Connection {
  name: string
  icon: React.ComponentType<{ className?: string }>
  connected: boolean
  description: string
}

const CONNECTIONS: Connection[] = [
  {
    name: "GitHub",
    icon: GithubIcon,
    connected: true,
    description: "Repos, PRs, and issue tracking",
  },
  {
    name: "Telegram",
    icon: SendIcon,
    connected: true,
    description: "Message relay and notifications",
  },
  {
    name: "WhatsApp",
    icon: MessageCircleIcon,
    connected: false,
    description: "Customer support channel",
  },
  {
    name: "Slack",
    icon: SlackIcon,
    connected: true,
    description: "Team communication and alerts",
  },
  {
    name: "Email",
    icon: MailIcon,
    connected: true,
    description: "Inbox monitoring and responses",
  },
  {
    name: "Linear",
    icon: GlobeIcon,
    connected: false,
    description: "Project and issue management",
  },
]

export function AgentConnections() {
  const connectedCount = CONNECTIONS.filter((c) => c.connected).length

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Connections</CardTitle>
        <CardDescription>
          {connectedCount} of {CONNECTIONS.length} connected
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-0">
        {CONNECTIONS.map((conn, i) => (
          <div key={conn.name}>
            {i > 0 && <Separator />}
            <div className="flex items-center gap-3 py-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60 ring-1 ring-foreground/5">
                <conn.icon className="size-3.5 text-muted-foreground" />
              </div>
              <div className="flex flex-1 flex-col min-w-0">
                <span className="text-sm font-medium">{conn.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {conn.description}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`size-2 rounded-full ${
                    conn.connected
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  }`}
                />
                <span className="text-xs text-muted-foreground">
                  {conn.connected ? "Connected" : "Not connected"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
