// @ts-nocheck — shadcn generated component
"use client"

import * as React from "react"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import { restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { toast } from "sonner"
import { z } from "zod"

import { useIsMobile } from "@/hooks/use-mobile"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  GripVerticalIcon,
  CircleCheckIcon,
  LoaderIcon,
  EllipsisVerticalIcon,
  Columns3Icon,
  ChevronDownIcon,
  PlusIcon,
  ChevronsLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsRightIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  CircleIcon,
  TargetIcon,
  KeyRoundIcon,
  HashIcon,
} from "lucide-react"

// --- Schema ---

export const okrSchema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(), // "Objective" | "Key Result"
  status: z.string(), // RAG status label
  progress: z.string(), // percentage
  current: z.string(),
  target: z.string(),
  unit: z.string(),
  confidence: z.string(),
  owner: z.string(),
  ownerInitials: z.string(),
  timePeriod: z.string(),
  channel: z.string().optional(),
  parentObjective: z.string().optional(),
  aiOwner: z.string().optional(),
  humanOwner: z.string().optional(),
})

export type OKRRow = z.infer<typeof okrSchema>

// --- Status config ---

const statusConfig: Record<string, { color: string; dot: string; badgeClass: string }> = {
  "On Track": {
    color: "text-primary",
    dot: "bg-primary",
    badgeClass: "border-primary/30 text-primary",
  },
  "At Risk": {
    color: "text-amber-400",
    dot: "bg-amber-400",
    badgeClass: "border-amber-400/30 text-amber-400",
  },
  Behind: {
    color: "text-red-400",
    dot: "bg-red-400",
    badgeClass: "border-red-400/30 text-red-400",
  },
  Completed: {
    color: "text-primary",
    dot: "bg-primary",
    badgeClass: "border-primary/30 text-primary",
  },
  "Not Started": {
    color: "text-muted-foreground",
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

// --- OKR data is now derived from OBJECTIVES in mock-data.ts ---

import { OBJECTIVES, objectivesToOKRRows } from "@/lib/mock-data"

export const okrData: OKRRow[] = objectivesToOKRRows(OBJECTIVES)

// --- Drag handle ---

function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id })
  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="size-7 text-muted-foreground hover:bg-transparent"
    >
      <GripVerticalIcon className="size-3 text-muted-foreground" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

// --- Confidence trend icon ---

function ConfidenceTrend({ confidence }: { confidence: number }) {
  if (confidence >= 7) return <TrendingUpIcon className="size-3 text-primary" />
  if (confidence >= 4) return <MinusIcon className="size-3 text-amber-400" />
  return <TrendingDownIcon className="size-3 text-red-400" />
}

function getConfidenceColor(c: number): string {
  if (c >= 7) return "text-primary"
  if (c >= 4) return "text-amber-400"
  return "text-red-400"
}

// --- Chart data for drawer ---

const chartData = [
  { week: "W1", progress: 5 },
  { week: "W2", progress: 12 },
  { week: "W3", progress: 22 },
  { week: "W4", progress: 35 },
  { week: "W5", progress: 48 },
  { week: "W6", progress: 55 },
  { week: "W7", progress: 63 },
  { week: "W8", progress: 72 },
  { week: "W9", progress: 78 },
  { week: "W10", progress: 85 },
  { week: "W11", progress: 90 },
  { week: "W12", progress: 93 },
]

const chartConfig = {
  progress: {
    label: "Progress",
    color: "var(--primary)",
  },
} satisfies ChartConfig

// --- Channel options ---

const channelOptions = [
  { label: "general", value: "general" },
  { label: "code-review", value: "code-review" },
  { label: "design", value: "design" },
  { label: "approvals", value: "approvals" },
]

// --- Columns (all rows — Objectives + indented Key Results) ---

function makeColumns(allData: OKRRow[]): ColumnDef<OKRRow>[] {
  return [
    {
      id: "drag",
      header: () => null,
      cell: ({ row }) => <DragHandle id={row.original.id} />,
    },
    {
      id: "select",
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={
              table.getIsSomePageRowsSelected() &&
              !table.getIsAllPageRowsSelected()
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "header",
      header: "Title",
      cell: ({ row }) => <OKRCellViewer item={row.original} allData={allData} />,
      enableHiding: false,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <div className="w-28">
          <Badge variant="outline" className="gap-1 px-1.5 text-muted-foreground">
            {row.original.type === "Objective" ? (
              <TargetIcon className="size-3" />
            ) : (
              <KeyRoundIcon className="size-3" />
            )}
            {row.original.type}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const cfg = statusConfig[row.original.status] || statusConfig["Not Started"]
        return (
          <Badge variant="outline" className={`gap-1.5 px-1.5 ${cfg.badgeClass}`}>
            {row.original.status === "Completed" ? (
              <CircleCheckIcon className="size-3 fill-primary text-primary-foreground" />
            ) : row.original.status === "Not Started" ? (
              <CircleIcon className="size-3" />
            ) : (
              <LoaderIcon className="size-3" />
            )}
            {row.original.status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "progress",
      header: () => <div className="w-full text-right">Progress</div>,
      cell: ({ row }) => {
        const pct = parseInt(row.original.progress) || 0
        const barColor = getProgressBarColor(row.original.status)
        return (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`w-10 text-right text-xs font-mono font-medium ${statusConfig[row.original.status]?.color || "text-muted-foreground"}`}>
              {pct}%
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "target",
      header: () => <div className="w-full text-right">Target</div>,
      cell: ({ row }) => {
        if (row.original.type === "Objective") {
          // Show channel for objectives
          if (!row.original.channel) return null
          return (
            <Badge variant="outline" className="gap-1 px-1.5 text-muted-foreground">
              <HashIcon className="size-3" />
              {row.original.channel}
            </Badge>
          )
        }
        return (
          <div className="flex items-baseline gap-1 justify-end">
            <span className="text-xs font-mono text-foreground/70">
              {row.original.current}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              / {row.original.target} {row.original.unit}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "confidence",
      header: () => <div className="w-full text-right">Confidence</div>,
      cell: ({ row }) => {
        const c = parseInt(row.original.confidence) || 0
        return (
          <div className="flex items-center gap-1 justify-end">
            <ConfidenceTrend confidence={c} />
            <span className={`text-xs font-mono font-medium ${getConfidenceColor(c)}`}>
              {c}/10
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "owner",
      header: "Owner",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-6 border border-border">
            <AvatarFallback className="text-[9px] font-semibold bg-secondary text-foreground/70">
              {row.original.ownerInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm truncate hidden lg:inline">{row.original.owner}</span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="flex size-8 text-muted-foreground data-open:bg-muted"
                size="icon"
              />
            }
          >
            <EllipsisVerticalIcon />
            <span className="sr-only">Open menu</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            {row.original.type === "Objective" && (
              <DropdownMenuItem>Add Key Result</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}

// --- Draggable row ---

function DraggableRow({ row }: { row: Row<OKRRow> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({
    id: row.original.id,
  })
  const isKR = row.original.type === "Key Result"
  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className={`relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80 ${isKR ? "bg-background/50" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  )
}

// --- Key Result row inside drawer ---

function KeyResultRow({ kr }: { kr: OKRRow }) {
  const cfg = statusConfig[kr.status] || statusConfig["Not Started"]
  const pct = parseInt(kr.progress) || 0
  const c = parseInt(kr.confidence) || 0
  return (
    <div className="flex items-center gap-3 py-3 px-1 border-b border-border/50 last:border-0">
      <CircleIcon className={`size-2.5 shrink-0 fill-current ${cfg.color}`} />
      <span className="flex-1 text-sm truncate">{kr.header}</span>
      <span className="text-xs font-mono text-foreground/70 shrink-0">
        {kr.current}
        <span className="text-muted-foreground"> / {kr.target} {kr.unit}</span>
      </span>
      <div className="w-16 shrink-0">
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full ${getProgressBarColor(kr.status)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="flex items-center gap-1 shrink-0">
        <ConfidenceTrend confidence={c} />
        <span className={`text-xs font-mono font-medium ${getConfidenceColor(c)}`}>
          {c}/10
        </span>
      </span>
      <Avatar className="size-6 shrink-0 border border-border">
        <AvatarFallback className="text-[9px] font-semibold bg-secondary text-foreground/70">
          {kr.ownerInitials}
        </AvatarFallback>
      </Avatar>
    </div>
  )
}

// --- Drawer cell viewer ---

function OKRCellViewer({ item, allData }: { item: OKRRow; allData: OKRRow[] }) {
  const isMobile = useIsMobile()
  const cfg = statusConfig[item.status] || statusConfig["Not Started"]
  const isObjective = item.type === "Objective"
  const keyResults = isObjective
    ? allData.filter((d) => d.type === "Key Result" && d.parentObjective === item.header)
    : []

  // KR rows: indented, no drawer
  if (!isObjective) {
    return (
      <span className="flex items-center gap-2 pl-6 text-foreground/80">
        <span className={`size-2 shrink-0 rounded-full ${cfg.dot}`} />
        {item.header}
      </span>
    )
  }

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger
        render={
          <Button
            variant="link"
            className="w-fit px-0 text-left text-foreground font-semibold"
          />
        }
      >
        <span className="flex items-center gap-2">
          <span className={`size-2 shrink-0 rounded-full ${cfg.dot}`} />
          {item.header}
        </span>
      </DrawerTrigger>
      <DrawerContent className="sm:max-w-[50%]">
        <DrawerHeader className="gap-1">
          <DrawerTitle>{item.header}</DrawerTitle>
          <DrawerDescription>
            {item.timePeriod} · {keyResults.length} Key Results
          </DrawerDescription>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 text-sm">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
              <TabsTrigger value="key-results" className="flex-1">
                Key Results
                <Badge variant="secondary" className="ml-1.5 size-5 rounded-full bg-muted-foreground/30 px-1">
                  {keyResults.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* --- Overview tab --- */}
            <TabsContent value="overview" className="flex flex-col gap-4">
              {!isMobile && (
                <>
                  <ChartContainer config={chartConfig}>
                    <AreaChart
                      accessibilityLayer
                      data={chartData}
                      margin={{ left: 0, right: 10 }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="week"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        hide
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                      />
                      <Area
                        dataKey="progress"
                        type="natural"
                        fill="var(--color-progress)"
                        fillOpacity={0.4}
                        stroke="var(--color-progress)"
                      />
                    </AreaChart>
                  </ChartContainer>
                  <Separator />
                  <div className="grid gap-2">
                    <div className="flex gap-2 leading-none font-medium">
                      Progress over {item.timePeriod}
                      <TrendingUpIcon className="size-4" />
                    </div>
                    <div className="text-muted-foreground">
                      Weekly progress tracking across the quarter. Current progress
                      is at {item.progress}%.
                    </div>
                  </div>
                  <Separator />
                </>
              )}
              <form className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <Label htmlFor="okr-header">Title</Label>
                  <Input id="okr-header" defaultValue={item.header} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="okr-status">Status</Label>
                    <Select
                      defaultValue={item.status}
                      items={[
                        { label: "On Track", value: "On Track" },
                        { label: "At Risk", value: "At Risk" },
                        { label: "Behind", value: "Behind" },
                        { label: "Completed", value: "Completed" },
                        { label: "Not Started", value: "Not Started" },
                      ]}
                    >
                      <SelectTrigger id="okr-status" className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="On Track">On Track</SelectItem>
                          <SelectItem value="At Risk">At Risk</SelectItem>
                          <SelectItem value="Behind">Behind</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Not Started">Not Started</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="okr-channel">Channel</Label>
                    <Select
                      defaultValue={item.channel || ""}
                      items={channelOptions}
                    >
                      <SelectTrigger id="okr-channel" className="w-full">
                        <SelectValue placeholder="Select channel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {channelOptions.map((ch) => (
                            <SelectItem key={ch.value} value={ch.value}>
                              <span className="flex items-center gap-1.5">
                                <HashIcon className="size-3 text-muted-foreground" />
                                {ch.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="okr-confidence">Confidence (0-10)</Label>
                    <Input
                      id="okr-confidence"
                      type="number"
                      min={0}
                      max={10}
                      defaultValue={item.confidence}
                    />
                  </div>
                  <div className="flex flex-col gap-3">
                    <Label htmlFor="okr-owner">Owner</Label>
                    <Select
                      defaultValue={item.owner}
                      items={[
                        { label: "Architect", value: "Architect" },
                        { label: "Coder 1", value: "Coder 1" },
                        { label: "Coder 2", value: "Coder 2" },
                        { label: "DevOps", value: "DevOps" },
                        { label: "Tester", value: "Tester" },
                        { label: "Lint Bot", value: "Lint Bot" },
                        { label: "PM", value: "PM" },
                      ]}
                    >
                      <SelectTrigger id="okr-owner" className="w-full">
                        <SelectValue placeholder="Select owner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="Architect">Architect</SelectItem>
                          <SelectItem value="Coder 1">Coder 1</SelectItem>
                          <SelectItem value="Coder 2">Coder 2</SelectItem>
                          <SelectItem value="DevOps">DevOps</SelectItem>
                          <SelectItem value="Tester">Tester</SelectItem>
                          <SelectItem value="Lint Bot">Lint Bot</SelectItem>
                          <SelectItem value="PM">PM</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </form>
            </TabsContent>

            {/* --- Key Results tab --- */}
            <TabsContent value="key-results" className="flex flex-col gap-2">
              {keyResults.length > 0 ? (
                <div className="rounded-lg border border-border bg-card">
                  {keyResults.map((kr) => (
                    <KeyResultRow key={kr.id} kr={kr} />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No Key Results yet. Add one to start tracking.
                </div>
              )}
              <Button variant="outline" size="sm" className="w-fit mt-2">
                <PlusIcon />
                Add Key Result
              </Button>
            </TabsContent>
          </Tabs>
        </div>
        <DrawerFooter>
          <Button>Save Changes</Button>
          <DrawerClose render={<Button variant="outline" />}>Cancel</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

// --- Main OKR DataTable ---

export function OKRDataTable({
  data: initialData,
}: {
  data: OKRRow[]
}) {
  const [allData, setAllData] = React.useState(() => initialData)
  const columns = React.useMemo(() => makeColumns(allData), [allData])

  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 20,
  })
  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )
  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => allData?.map(({ id }) => id) || [],
    [allData]
  )

  // Counts for tab badges
  const objectives = allData.filter((d) => d.type === "Objective")
  const atRiskCount = allData.filter(
    (d) => d.status === "At Risk" || d.status === "Behind"
  ).length
  const completedCount = allData.filter((d) => d.status === "Completed").length
  const objectivesCount = objectives.length

  const table = useReactTable({
    data: allData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setAllData((prev) => {
        // Reorder only objectives, keeping KRs in place relative to their parents
        const objectives = prev.filter((d) => d.type === "Objective")
        const oldIndex = objectives.findIndex((d) => d.id === active.id)
        const newIndex = objectives.findIndex((d) => d.id === over.id)
        const reordered = arrayMove(objectives, oldIndex, newIndex)
        // Rebuild: for each objective, append its KRs
        const result: OKRRow[] = []
        for (const obj of reordered) {
          result.push(obj)
          result.push(...prev.filter((d) => d.type === "Key Result" && d.parentObjective === obj.header))
        }
        return result
      })
    }
  }

  return (
    <Tabs
      defaultValue="all-okrs"
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between px-4 lg:px-6">
        <Label htmlFor="okr-view-selector" className="sr-only">
          View
        </Label>
        <Select
          defaultValue="all-okrs"
          items={[
            { label: "All OKRs", value: "all-okrs" },
            { label: "Needs Attention", value: "needs-attention" },
            { label: "By Owner", value: "by-owner" },
            { label: "Completed", value: "completed" },
          ]}
        >
          <SelectTrigger
            className="flex w-fit @4xl/main:hidden"
            size="sm"
            id="okr-view-selector"
          >
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all-okrs">All OKRs</SelectItem>
              <SelectItem value="needs-attention">Needs Attention</SelectItem>
              <SelectItem value="by-owner">By Owner</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <TabsList className="hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:bg-muted-foreground/30 **:data-[slot=badge]:px-1 @4xl/main:flex">
          <TabsTrigger value="all-okrs">
            All OKRs <Badge variant="secondary">{objectivesCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="needs-attention">
            Needs Attention <Badge variant="secondary">{atRiskCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="by-owner">By Owner</TabsTrigger>
          <TabsTrigger value="completed">
            Completed <Badge variant="secondary">{completedCount}</Badge>
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="sm" />}
            >
              <Columns3Icon data-icon="inline-start" />
              Columns
              <ChevronDownIcon data-icon="inline-end" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm">
            <PlusIcon />
            <span className="hidden lg:inline">New Objective</span>
          </Button>
        </div>
      </div>
      <TabsContent
        value="all-okrs"
        className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6"
      >
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} colSpan={header.colSpan}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext
                    items={dataIds}
                    strategy={verticalListSortingStrategy}
                  >
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="okr-rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value))
                }}
                items={[10, 20, 30, 50].map((pageSize) => ({
                  label: `${pageSize}`,
                  value: `${pageSize}`,
                }))}
              >
                <SelectTrigger size="sm" className="w-20" id="okr-rows-per-page">
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 20, 30, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
      <TabsContent
        value="needs-attention"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
      </TabsContent>
      <TabsContent value="by-owner" className="flex flex-col px-4 lg:px-6">
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
      </TabsContent>
      <TabsContent
        value="completed"
        className="flex flex-col px-4 lg:px-6"
      >
        <div className="aspect-video w-full flex-1 rounded-lg border border-dashed" />
      </TabsContent>
    </Tabs>
  )
}
