"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive area chart"

const chartData = [
  { date: "2024-04-01", messages: 222, tasks: 150, tokens: 180, cost: 95 },
  { date: "2024-04-02", messages: 97, tasks: 180, tokens: 120, cost: 60 },
  { date: "2024-04-03", messages: 167, tasks: 120, tokens: 140, cost: 72 },
  { date: "2024-04-04", messages: 242, tasks: 260, tokens: 210, cost: 115 },
  { date: "2024-04-05", messages: 373, tasks: 290, tokens: 310, cost: 155 },
  { date: "2024-04-06", messages: 301, tasks: 340, tokens: 280, cost: 140 },
  { date: "2024-04-07", messages: 245, tasks: 180, tokens: 200, cost: 105 },
  { date: "2024-04-08", messages: 409, tasks: 320, tokens: 350, cost: 175 },
  { date: "2024-04-09", messages: 59, tasks: 110, tokens: 80, cost: 40 },
  { date: "2024-04-10", messages: 261, tasks: 190, tokens: 220, cost: 110 },
  { date: "2024-04-11", messages: 327, tasks: 350, tokens: 290, cost: 145 },
  { date: "2024-04-12", messages: 292, tasks: 210, tokens: 250, cost: 125 },
  { date: "2024-04-13", messages: 342, tasks: 380, tokens: 310, cost: 155 },
  { date: "2024-04-14", messages: 137, tasks: 220, tokens: 160, cost: 80 },
  { date: "2024-04-15", messages: 120, tasks: 170, tokens: 130, cost: 65 },
  { date: "2024-04-16", messages: 138, tasks: 190, tokens: 150, cost: 75 },
  { date: "2024-04-17", messages: 446, tasks: 360, tokens: 380, cost: 190 },
  { date: "2024-04-18", messages: 364, tasks: 410, tokens: 340, cost: 170 },
  { date: "2024-04-19", messages: 243, tasks: 180, tokens: 200, cost: 100 },
  { date: "2024-04-20", messages: 89, tasks: 150, tokens: 100, cost: 50 },
  { date: "2024-04-21", messages: 137, tasks: 200, tokens: 150, cost: 75 },
  { date: "2024-04-22", messages: 224, tasks: 170, tokens: 190, cost: 95 },
  { date: "2024-04-23", messages: 138, tasks: 230, tokens: 170, cost: 85 },
  { date: "2024-04-24", messages: 387, tasks: 290, tokens: 330, cost: 165 },
  { date: "2024-04-25", messages: 215, tasks: 250, tokens: 200, cost: 100 },
  { date: "2024-04-26", messages: 75, tasks: 130, tokens: 90, cost: 45 },
  { date: "2024-04-27", messages: 383, tasks: 420, tokens: 360, cost: 180 },
  { date: "2024-04-28", messages: 122, tasks: 180, tokens: 140, cost: 70 },
  { date: "2024-04-29", messages: 315, tasks: 240, tokens: 270, cost: 135 },
  { date: "2024-04-30", messages: 454, tasks: 380, tokens: 390, cost: 195 },
  { date: "2024-05-01", messages: 165, tasks: 220, tokens: 170, cost: 85 },
  { date: "2024-05-02", messages: 293, tasks: 310, tokens: 260, cost: 130 },
  { date: "2024-05-03", messages: 247, tasks: 190, tokens: 210, cost: 105 },
  { date: "2024-05-04", messages: 385, tasks: 420, tokens: 350, cost: 175 },
  { date: "2024-05-05", messages: 481, tasks: 390, tokens: 410, cost: 205 },
  { date: "2024-05-06", messages: 498, tasks: 520, tokens: 440, cost: 220 },
  { date: "2024-05-07", messages: 388, tasks: 300, tokens: 330, cost: 165 },
  { date: "2024-05-08", messages: 149, tasks: 210, tokens: 160, cost: 80 },
  { date: "2024-05-09", messages: 227, tasks: 180, tokens: 190, cost: 95 },
  { date: "2024-05-10", messages: 293, tasks: 330, tokens: 270, cost: 135 },
  { date: "2024-05-11", messages: 335, tasks: 270, tokens: 290, cost: 145 },
  { date: "2024-05-12", messages: 197, tasks: 240, tokens: 200, cost: 100 },
  { date: "2024-05-13", messages: 197, tasks: 160, tokens: 170, cost: 85 },
  { date: "2024-05-14", messages: 448, tasks: 490, tokens: 400, cost: 200 },
  { date: "2024-05-15", messages: 473, tasks: 380, tokens: 390, cost: 195 },
  { date: "2024-05-16", messages: 338, tasks: 400, tokens: 320, cost: 160 },
  { date: "2024-05-17", messages: 499, tasks: 420, tokens: 430, cost: 215 },
  { date: "2024-05-18", messages: 315, tasks: 350, tokens: 290, cost: 145 },
  { date: "2024-05-19", messages: 235, tasks: 180, tokens: 200, cost: 100 },
  { date: "2024-05-20", messages: 177, tasks: 230, tokens: 180, cost: 90 },
  { date: "2024-05-21", messages: 82, tasks: 140, tokens: 100, cost: 50 },
  { date: "2024-05-22", messages: 81, tasks: 120, tokens: 90, cost: 45 },
  { date: "2024-05-23", messages: 252, tasks: 290, tokens: 230, cost: 115 },
  { date: "2024-05-24", messages: 294, tasks: 220, tokens: 250, cost: 125 },
  { date: "2024-05-25", messages: 201, tasks: 250, tokens: 200, cost: 100 },
  { date: "2024-05-26", messages: 213, tasks: 170, tokens: 180, cost: 90 },
  { date: "2024-05-27", messages: 420, tasks: 460, tokens: 380, cost: 190 },
  { date: "2024-05-28", messages: 233, tasks: 190, tokens: 200, cost: 100 },
  { date: "2024-05-29", messages: 78, tasks: 130, tokens: 90, cost: 45 },
  { date: "2024-05-30", messages: 340, tasks: 280, tokens: 290, cost: 145 },
  { date: "2024-05-31", messages: 178, tasks: 230, tokens: 170, cost: 85 },
  { date: "2024-06-01", messages: 178, tasks: 200, tokens: 160, cost: 80 },
  { date: "2024-06-02", messages: 470, tasks: 410, tokens: 400, cost: 200 },
  { date: "2024-06-03", messages: 103, tasks: 160, tokens: 120, cost: 60 },
  { date: "2024-06-04", messages: 439, tasks: 380, tokens: 370, cost: 185 },
  { date: "2024-06-05", messages: 88, tasks: 140, tokens: 100, cost: 50 },
  { date: "2024-06-06", messages: 294, tasks: 250, tokens: 250, cost: 125 },
  { date: "2024-06-07", messages: 323, tasks: 370, tokens: 300, cost: 150 },
  { date: "2024-06-08", messages: 385, tasks: 320, tokens: 330, cost: 165 },
  { date: "2024-06-09", messages: 438, tasks: 480, tokens: 400, cost: 200 },
  { date: "2024-06-10", messages: 155, tasks: 200, tokens: 150, cost: 75 },
  { date: "2024-06-11", messages: 92, tasks: 150, tokens: 100, cost: 50 },
  { date: "2024-06-12", messages: 492, tasks: 420, tokens: 420, cost: 210 },
  { date: "2024-06-13", messages: 81, tasks: 130, tokens: 90, cost: 45 },
  { date: "2024-06-14", messages: 426, tasks: 380, tokens: 360, cost: 180 },
  { date: "2024-06-15", messages: 307, tasks: 350, tokens: 280, cost: 140 },
  { date: "2024-06-16", messages: 371, tasks: 310, tokens: 320, cost: 160 },
  { date: "2024-06-17", messages: 475, tasks: 520, tokens: 430, cost: 215 },
  { date: "2024-06-18", messages: 107, tasks: 170, tokens: 120, cost: 60 },
  { date: "2024-06-19", messages: 341, tasks: 290, tokens: 290, cost: 145 },
  { date: "2024-06-20", messages: 408, tasks: 450, tokens: 370, cost: 185 },
  { date: "2024-06-21", messages: 169, tasks: 210, tokens: 160, cost: 80 },
  { date: "2024-06-22", messages: 317, tasks: 270, tokens: 270, cost: 135 },
  { date: "2024-06-23", messages: 480, tasks: 530, tokens: 430, cost: 215 },
  { date: "2024-06-24", messages: 132, tasks: 180, tokens: 130, cost: 65 },
  { date: "2024-06-25", messages: 141, tasks: 190, tokens: 140, cost: 70 },
  { date: "2024-06-26", messages: 434, tasks: 380, tokens: 370, cost: 185 },
  { date: "2024-06-27", messages: 448, tasks: 490, tokens: 400, cost: 200 },
  { date: "2024-06-28", messages: 149, tasks: 200, tokens: 140, cost: 70 },
  { date: "2024-06-29", messages: 103, tasks: 160, tokens: 110, cost: 55 },
  { date: "2024-06-30", messages: 446, tasks: 400, tokens: 380, cost: 190 },
]

const chartConfig = {
  activity: {
    label: "Activity",
  },
  messages: {
    label: "Messages",
    color: "var(--primary)",
  },
  tasks: {
    label: "Tasks Completed",
    color: "oklch(0.65 0.15 160)",
  },
  tokens: {
    label: "Tokens Consumed",
    color: "oklch(0.70 0.15 250)",
  },
  cost: {
    label: "Cost ($)",
    color: "oklch(0.70 0.12 50)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("90d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2024-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Agent Activity</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Messages, tasks, tokens, and cost over the last 3 months
          </span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            multiple={false}
            value={timeRange ? [timeRange] : []}
            onValueChange={(value) => {
              setTimeRange(value[0] ?? "90d")
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={timeRange}
            onValueChange={(value) => {
              if (value !== null) {
                setTimeRange(value)
              }
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillMessages" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-messages)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-messages)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillTasks" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-tasks)"
                  stopOpacity={0.7}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-tasks)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillTokens" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-tokens)"
                  stopOpacity={0.6}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-tokens)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-cost)"
                  stopOpacity={0.5}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-cost)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="cost"
              type="natural"
              fill="url(#fillCost)"
              stroke="var(--color-cost)"
              stackId="a"
            />
            <Area
              dataKey="tokens"
              type="natural"
              fill="url(#fillTokens)"
              stroke="var(--color-tokens)"
              stackId="a"
            />
            <Area
              dataKey="tasks"
              type="natural"
              fill="url(#fillTasks)"
              stroke="var(--color-tasks)"
              stackId="a"
            />
            <Area
              dataKey="messages"
              type="natural"
              fill="url(#fillMessages)"
              stroke="var(--color-messages)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
