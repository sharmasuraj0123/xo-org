"use client"

import Link from "next/link"
import { OBJECTIVES } from "@/lib/mock-data"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CircleCheckIcon,
  CircleIcon,
  ArrowRightIcon,
  TargetIcon,
} from "lucide-react"

const statusConfig: Record<string, { dot: string; badgeClass: string }> = {
  "On Track": {
    dot: "bg-primary",
    badgeClass: "border-primary/30 text-primary",
  },
  "At Risk": {
    dot: "bg-amber-400",
    badgeClass: "border-amber-400/30 text-amber-400",
  },
  Behind: {
    dot: "bg-red-400",
    badgeClass: "border-red-400/30 text-red-400",
  },
  Completed: {
    dot: "bg-primary",
    badgeClass: "border-primary/30 text-primary",
  },
  "Not Started": {
    dot: "bg-muted-foreground",
    badgeClass: "border-muted-foreground/30 text-muted-foreground",
  },
}

function getProgressBarColor(status: string): string {
  if (status === "On Track" || status === "Completed") return "bg-primary"
  if (status === "At Risk") return "bg-amber-400"
  if (status === "Behind") return "bg-red-400"
  return "bg-muted-foreground"
}

export function AgentObjectivesSummary({ agentId }: { agentId: string }) {
  const objectives = OBJECTIVES.filter((obj) => obj.aiOwner === agentId)

  if (objectives.length === 0) {
    return (
      <div className="px-4 lg:px-6">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TargetIcon className="size-4 text-muted-foreground" />
              Objectives
            </CardTitle>
            <CardDescription>No objectives assigned to this agent.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Objectives</h3>
        <Link
          href={`/agent/${agentId}/objectives`}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
          <ArrowRightIcon className="size-3" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        {objectives.map((obj) => {
          const cfg = statusConfig[obj.status] || statusConfig["Not Started"]
          const krCount = obj.keyResults.length
          const completedKrs = obj.keyResults.filter(
            (kr) => kr.status === "completed"
          ).length

          return (
            <Link key={obj.id} href={`/agent/${agentId}/objectives`}>
              <Card
                size="sm"
                className="transition-colors hover:bg-muted/50 cursor-pointer"
              >
                <CardHeader>
                  <CardTitle className="line-clamp-1">{obj.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`gap-1.5 px-1.5 ${cfg.badgeClass}`}
                    >
                      {obj.status === "Completed" ? (
                        <CircleCheckIcon className="size-3 fill-primary text-primary-foreground" />
                      ) : obj.status === "Not Started" ? (
                        <CircleIcon className="size-3" />
                      ) : (
                        <span
                          className={`size-1.5 rounded-full ${cfg.dot}`}
                        />
                      )}
                      {obj.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {obj.timePeriod}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${getProgressBarColor(obj.status)}`}
                        style={{ width: `${obj.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums">
                      {obj.progress}%
                    </span>
                  </div>
                </CardContent>
                <CardFooter>
                  <span className="text-xs text-muted-foreground">
                    {completedKrs}/{krCount} key results completed
                  </span>
                </CardFooter>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
