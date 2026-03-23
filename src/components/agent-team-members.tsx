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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { AGENTS, type AgentRole } from "@/lib/mock-data"

const ROLE_COLORS: Record<AgentRole, { bg: string; text: string }> = {
  Research: { bg: "bg-blue-500/20", text: "text-blue-400" },
  Engineering: { bg: "bg-primary/20", text: "text-primary" },
  DevOps: { bg: "bg-orange-400/20", text: "text-orange-400" },
  Design: { bg: "bg-purple-400/20", text: "text-purple-400" },
  Product: { bg: "bg-cyan-400/20", text: "text-cyan-400" },
  Analytics: { bg: "bg-yellow-400/20", text: "text-yellow-400" },
  Security: { bg: "bg-red-400/20", text: "text-red-400" },
  Support: { bg: "bg-teal-400/20", text: "text-teal-400" },
}

const ALL_ROLES: AgentRole[] = [
  "Research",
  "Engineering",
  "DevOps",
  "Design",
  "Product",
  "Analytics",
  "Security",
  "Support",
]

export function AgentTeamMembers() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>
          Invite your team members to collaborate.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-0">
        {AGENTS.map((agent, i) => {
          const colors = ROLE_COLORS[agent.role]
          return (
            <div key={agent.id}>
              {i > 0 && <Separator />}
              <div className="flex items-center gap-3 py-3">
                <Avatar className={cn("size-9", colors.bg)}>
                  <AvatarFallback
                    className={cn(
                      "text-xs font-bold",
                      colors.bg,
                      colors.text
                    )}
                  >
                    {agent.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-1 flex-col min-w-0">
                  <span className="text-sm font-medium">
                    {agent.name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {agent.model}
                  </span>
                </div>
                <Select defaultValue={agent.role}>
                  <SelectTrigger className="w-28" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {ALL_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
