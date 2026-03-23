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

const chartData = [
  { date: "2024-04-01", claude: 18, openai: 12 },
  { date: "2024-04-02", claude: 8, openai: 14 },
  { date: "2024-04-03", claude: 14, openai: 10 },
  { date: "2024-04-04", claude: 20, openai: 22 },
  { date: "2024-04-05", claude: 31, openai: 24 },
  { date: "2024-04-06", claude: 25, openai: 28 },
  { date: "2024-04-07", claude: 20, openai: 15 },
  { date: "2024-04-08", claude: 34, openai: 27 },
  { date: "2024-04-09", claude: 5, openai: 9 },
  { date: "2024-04-10", claude: 22, openai: 16 },
  { date: "2024-04-11", claude: 27, openai: 29 },
  { date: "2024-04-12", claude: 24, openai: 18 },
  { date: "2024-04-13", claude: 29, openai: 32 },
  { date: "2024-04-14", claude: 11, openai: 18 },
  { date: "2024-04-15", claude: 10, openai: 14 },
  { date: "2024-04-16", claude: 12, openai: 16 },
  { date: "2024-04-17", claude: 37, openai: 30 },
  { date: "2024-04-18", claude: 30, openai: 34 },
  { date: "2024-04-19", claude: 20, openai: 15 },
  { date: "2024-04-20", claude: 7, openai: 13 },
  { date: "2024-04-21", claude: 11, openai: 17 },
  { date: "2024-04-22", claude: 19, openai: 14 },
  { date: "2024-04-23", claude: 12, openai: 19 },
  { date: "2024-04-24", claude: 32, openai: 24 },
  { date: "2024-04-25", claude: 18, openai: 21 },
  { date: "2024-04-26", claude: 6, openai: 11 },
  { date: "2024-04-27", claude: 32, openai: 35 },
  { date: "2024-04-28", claude: 10, openai: 15 },
  { date: "2024-04-29", claude: 26, openai: 20 },
  { date: "2024-04-30", claude: 38, openai: 32 },
  { date: "2024-05-01", claude: 14, openai: 18 },
  { date: "2024-05-02", claude: 24, openai: 26 },
  { date: "2024-05-03", claude: 21, openai: 16 },
  { date: "2024-05-04", claude: 32, openai: 35 },
  { date: "2024-05-05", claude: 40, openai: 33 },
  { date: "2024-05-06", claude: 42, openai: 43 },
  { date: "2024-05-07", claude: 32, openai: 25 },
  { date: "2024-05-08", claude: 12, openai: 18 },
  { date: "2024-05-09", claude: 19, openai: 15 },
  { date: "2024-05-10", claude: 24, openai: 28 },
  { date: "2024-05-11", claude: 28, openai: 23 },
  { date: "2024-05-12", claude: 16, openai: 20 },
  { date: "2024-05-13", claude: 16, openai: 13 },
  { date: "2024-05-14", claude: 37, openai: 41 },
  { date: "2024-05-15", claude: 39, openai: 32 },
  { date: "2024-05-16", claude: 28, openai: 33 },
  { date: "2024-05-17", claude: 42, openai: 35 },
  { date: "2024-05-18", claude: 26, openai: 29 },
  { date: "2024-05-19", claude: 20, openai: 15 },
  { date: "2024-05-20", claude: 15, openai: 19 },
  { date: "2024-05-21", claude: 7, openai: 12 },
  { date: "2024-05-22", claude: 7, openai: 10 },
  { date: "2024-05-23", claude: 21, openai: 24 },
  { date: "2024-05-24", claude: 25, openai: 18 },
  { date: "2024-05-25", claude: 17, openai: 21 },
  { date: "2024-05-26", claude: 18, openai: 14 },
  { date: "2024-05-27", claude: 35, openai: 38 },
  { date: "2024-05-28", claude: 19, openai: 16 },
  { date: "2024-05-29", claude: 7, openai: 11 },
  { date: "2024-05-30", claude: 28, openai: 23 },
  { date: "2024-05-31", claude: 15, openai: 19 },
  { date: "2024-06-01", claude: 15, openai: 17 },
  { date: "2024-06-02", claude: 39, openai: 34 },
  { date: "2024-06-03", claude: 9, openai: 13 },
  { date: "2024-06-04", claude: 37, openai: 32 },
  { date: "2024-06-05", claude: 7, openai: 12 },
  { date: "2024-06-06", claude: 25, openai: 21 },
  { date: "2024-06-07", claude: 27, openai: 31 },
  { date: "2024-06-08", claude: 32, openai: 27 },
  { date: "2024-06-09", claude: 37, openai: 40 },
  { date: "2024-06-10", claude: 13, openai: 17 },
  { date: "2024-06-11", claude: 8, openai: 13 },
  { date: "2024-06-12", claude: 41, openai: 35 },
  { date: "2024-06-13", claude: 7, openai: 11 },
  { date: "2024-06-14", claude: 36, openai: 32 },
  { date: "2024-06-15", claude: 26, openai: 29 },
  { date: "2024-06-16", claude: 31, openai: 26 },
  { date: "2024-06-17", claude: 40, openai: 43 },
  { date: "2024-06-18", claude: 9, openai: 14 },
  { date: "2024-06-19", claude: 28, openai: 24 },
  { date: "2024-06-20", claude: 34, openai: 38 },
  { date: "2024-06-21", claude: 14, openai: 18 },
  { date: "2024-06-22", claude: 26, openai: 23 },
  { date: "2024-06-23", claude: 40, openai: 44 },
  { date: "2024-06-24", claude: 11, openai: 15 },
  { date: "2024-06-25", claude: 12, openai: 16 },
  { date: "2024-06-26", claude: 36, openai: 32 },
  { date: "2024-06-27", claude: 37, openai: 41 },
  { date: "2024-06-28", claude: 12, openai: 17 },
  { date: "2024-06-29", claude: 9, openai: 13 },
  { date: "2024-06-30", claude: 37, openai: 33 },
]

const chartConfig = {
  activity: {
    label: "Activity",
  },
  claude: {
    label: "Claude Models",
    color: "var(--primary)",
  },
  openai: {
    label: "OpenAI Models",
    color: "oklch(0.70 0.15 250)",
  },
} satisfies ChartConfig

export function AgentChart() {
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
        <CardTitle>Agent Tasks by Provider</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Tasks completed by Claude and OpenAI agents over the last 3 months
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
              <linearGradient id="fillClaude" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-claude)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-claude)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillOpenai" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-openai)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-openai)"
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
              dataKey="openai"
              type="natural"
              fill="url(#fillOpenai)"
              stroke="var(--color-openai)"
              stackId="a"
            />
            <Area
              dataKey="claude"
              type="natural"
              fill="url(#fillClaude)"
              stroke="var(--color-claude)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
