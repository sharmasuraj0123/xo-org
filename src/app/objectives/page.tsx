"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast, Toaster } from "sonner"
import {
  ChevronRightIcon,
  CircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  CalendarIcon,
  PlusIcon,
  Trash2Icon,
  PencilIcon,
  CheckIcon,
  XIcon,
} from "lucide-react"

// --- Types ---

type RAGStatus = "on-track" | "at-risk" | "behind" | "completed" | "not-started"

type KeyResult = {
  id: string
  title: string
  current: number
  target: number
  unit: string
  status: RAGStatus
  owner: { name: string; initials: string }
  confidence: number
  updatedAt: string
}

type Objective = {
  id: string
  title: string
  owner: { name: string; initials: string }
  timePeriod: string
  status: RAGStatus
  keyResults: KeyResult[]
}

// --- Mock Data ---

const initialObjectives: Objective[] = [
  {
    id: "obj-1",
    title: "Accelerate product delivery pipeline",
    owner: { name: "Architect", initials: "AR" },
    timePeriod: "Q1 2026",
    status: "on-track",
    keyResults: [
      {
        id: "kr-1a",
        title: "Reduce CI/CD pipeline time from 45min to under 15min",
        current: 22,
        target: 15,
        unit: "min",
        status: "at-risk",
        owner: { name: "Coder 1", initials: "C1" },
        confidence: 5,
        updatedAt: "2d ago",
      },
      {
        id: "kr-1b",
        title: "Increase deployment frequency to 3x per day",
        current: 2.4,
        target: 3,
        unit: "deploys/day",
        status: "on-track",
        owner: { name: "DevOps", initials: "DO" },
        confidence: 8,
        updatedAt: "1d ago",
      },
      {
        id: "kr-1c",
        title: "Achieve 99.5% deployment success rate",
        current: 99.2,
        target: 99.5,
        unit: "%",
        status: "on-track",
        owner: { name: "Tester", initials: "TS" },
        confidence: 9,
        updatedAt: "3h ago",
      },
    ],
  },
  {
    id: "obj-2",
    title: "Improve platform reliability and performance",
    owner: { name: "Architect", initials: "AR" },
    timePeriod: "Q1 2026",
    status: "at-risk",
    keyResults: [
      {
        id: "kr-2a",
        title: "Reduce p95 API latency from 420ms to under 200ms",
        current: 310,
        target: 200,
        unit: "ms",
        status: "behind",
        owner: { name: "Coder 2", initials: "C2" },
        confidence: 3,
        updatedAt: "5h ago",
      },
      {
        id: "kr-2b",
        title: "Achieve 99.9% uptime SLA",
        current: 99.7,
        target: 99.9,
        unit: "%",
        status: "at-risk",
        owner: { name: "DevOps", initials: "DO" },
        confidence: 5,
        updatedAt: "1d ago",
      },
      {
        id: "kr-2c",
        title: "Reduce error rate from 2.1% to under 0.5%",
        current: 1.2,
        target: 0.5,
        unit: "%",
        status: "at-risk",
        owner: { name: "Tester", initials: "TS" },
        confidence: 4,
        updatedAt: "6h ago",
      },
    ],
  },
  {
    id: "obj-3",
    title: "Establish design system v2",
    owner: { name: "Lint Bot", initials: "LB" },
    timePeriod: "Q1 2026",
    status: "not-started",
    keyResults: [
      {
        id: "kr-3a",
        title: "Audit and document all 48 existing components",
        current: 0,
        target: 48,
        unit: "components",
        status: "not-started",
        owner: { name: "Lint Bot", initials: "LB" },
        confidence: 5,
        updatedAt: "—",
      },
      {
        id: "kr-3b",
        title: "Migrate 100% of pages to new token system",
        current: 0,
        target: 100,
        unit: "%",
        status: "not-started",
        owner: { name: "Coder 1", initials: "C1" },
        confidence: 5,
        updatedAt: "—",
      },
    ],
  },
  {
    id: "obj-4",
    title: "Onboard and validate QA agent pipeline",
    owner: { name: "Tester", initials: "TS" },
    timePeriod: "Q1 2026",
    status: "completed",
    keyResults: [
      {
        id: "kr-4a",
        title: "Configure agent permissions across all channels",
        current: 5,
        target: 5,
        unit: "channels",
        status: "completed",
        owner: { name: "Tester", initials: "TS" },
        confidence: 10,
        updatedAt: "1w ago",
      },
      {
        id: "kr-4b",
        title: "Pass baseline regression suite with 100% coverage",
        current: 100,
        target: 100,
        unit: "%",
        status: "completed",
        owner: { name: "Tester", initials: "TS" },
        confidence: 10,
        updatedAt: "1w ago",
      },
      {
        id: "kr-4c",
        title: "Process 500 test cases in first validation run",
        current: 512,
        target: 500,
        unit: "cases",
        status: "completed",
        owner: { name: "Architect", initials: "AR" },
        confidence: 10,
        updatedAt: "1w ago",
      },
    ],
  },
]

const ownerOptions = [
  { name: "Architect", initials: "AR" },
  { name: "Coder 1", initials: "C1" },
  { name: "Coder 2", initials: "C2" },
  { name: "DevOps", initials: "DO" },
  { name: "Tester", initials: "TS" },
  { name: "Lint Bot", initials: "LB" },
  { name: "PM", initials: "PM" },
]

const timePeriodOptions = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"]

// --- Helpers ---

const ragConfig: Record<RAGStatus, { color: string; label: string; dot: string }> = {
  "on-track": { color: "text-primary", label: "On Track", dot: "bg-primary" },
  "at-risk": { color: "text-amber-400", label: "At Risk", dot: "bg-amber-400" },
  behind: { color: "text-red-400", label: "Behind", dot: "bg-red-400" },
  completed: { color: "text-primary", label: "Completed", dot: "bg-primary" },
  "not-started": { color: "text-muted-foreground", label: "Not Started", dot: "bg-muted-foreground" },
}

function getProgress(kr: KeyResult): number {
  if (kr.target === 0) return 0
  if (kr.unit === "ms" || kr.unit === "min" || (kr.unit === "%" && kr.target < kr.current && kr.status !== "completed")) {
    const start = kr.current + (kr.target - kr.current) * 2
    const progress = ((start - kr.current) / (start - kr.target)) * 100
    return Math.max(0, Math.min(100, progress))
  }
  return Math.max(0, Math.min(100, (kr.current / kr.target) * 100))
}

function getObjectiveProgress(obj: Objective): number {
  if (obj.keyResults.length === 0) return 0
  return Math.round(
    obj.keyResults.reduce((sum, kr) => sum + getProgress(kr), 0) / obj.keyResults.length
  )
}

function getConfidenceColor(c: number): string {
  if (c >= 7) return "text-primary"
  if (c >= 4) return "text-amber-400"
  return "text-red-400"
}

function getProgressBarColor(status: RAGStatus): string {
  if (status === "on-track" || status === "completed") return "bg-primary"
  if (status === "at-risk") return "bg-amber-400"
  if (status === "behind") return "bg-red-400"
  return "bg-muted-foreground"
}

function TrendIcon({ confidence }: { confidence: number }) {
  if (confidence >= 7) return <TrendingUpIcon className="size-3 text-primary" />
  if (confidence >= 4) return <MinusIcon className="size-3 text-amber-400" />
  return <TrendingDownIcon className="size-3 text-red-400" />
}

let nextId = 100

function generateId(prefix: string) {
  return `${prefix}-${++nextId}`
}

// --- Create Objective Dialog ---

function CreateObjectiveDialog({
  onCreateObjective,
}: {
  onCreateObjective: (obj: Objective) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [ownerIdx, setOwnerIdx] = React.useState<string>("")
  const [timePeriod, setTimePeriod] = React.useState("Q1 2026")
  const [status, setStatus] = React.useState<RAGStatus>("not-started")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const owner = ownerIdx ? ownerOptions[parseInt(ownerIdx)] : ownerOptions[0]
    const obj: Objective = {
      id: generateId("obj"),
      title: title.trim(),
      owner,
      timePeriod,
      status,
      keyResults: [],
    }
    onCreateObjective(obj)
    toast.success("Objective created", { description: obj.title })
    setTitle("")
    setOwnerIdx("")
    setTimePeriod("Q1 2026")
    setStatus("not-started")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <PlusIcon data-icon="inline-start" />
            New Objective
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Objective</DialogTitle>
          <DialogDescription>
            Define a high-level goal for your team to work toward.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="obj-title">Objective</Label>
            <Input
              id="obj-title"
              placeholder="e.g. Improve customer onboarding experience"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Owner</Label>
              <Select value={ownerIdx} onValueChange={setOwnerIdx}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select owner" />
                </SelectTrigger>
                <SelectContent>
                  {ownerOptions.map((o, i) => (
                    <SelectItem key={o.initials} value={String(i)}>
                      <span className="flex items-center gap-2">
                        <Avatar className="size-5 border border-border">
                          <AvatarFallback className="text-[8px] font-semibold bg-secondary text-foreground/70">
                            {o.initials}
                          </AvatarFallback>
                        </Avatar>
                        {o.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Time Period</Label>
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timePeriodOptions.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {tp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Initial Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as RAGStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ragConfig) as RAGStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${ragConfig[s].dot}`} />
                      {ragConfig[s].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!title.trim()}>
              Create Objective
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// --- Add Key Result Dialog ---

function AddKeyResultDialog({
  objectiveId,
  onAddKeyResult,
}: {
  objectiveId: string
  onAddKeyResult: (objId: string, kr: KeyResult) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState("")
  const [target, setTarget] = React.useState("")
  const [unit, setUnit] = React.useState("")
  const [ownerIdx, setOwnerIdx] = React.useState<string>("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !target) return

    const owner = ownerIdx ? ownerOptions[parseInt(ownerIdx)] : ownerOptions[0]
    const kr: KeyResult = {
      id: generateId("kr"),
      title: title.trim(),
      current: 0,
      target: parseFloat(target),
      unit: unit || "units",
      status: "not-started",
      owner,
      confidence: 5,
      updatedAt: "just now",
    }
    onAddKeyResult(objectiveId, kr)
    toast.success("Key Result added", { description: kr.title })
    setTitle("")
    setTarget("")
    setUnit("")
    setOwnerIdx("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex w-full items-center gap-2 px-5 py-2.5 pl-12 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors cursor-pointer"
          >
            <PlusIcon className="size-3.5" />
            Add Key Result
          </button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Key Result</DialogTitle>
          <DialogDescription>
            Define a measurable outcome that contributes to this objective.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`kr-title-${objectiveId}`}>Key Result</Label>
            <Input
              id={`kr-title-${objectiveId}`}
              placeholder="e.g. Reduce onboarding time from 5 days to 1 day"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label htmlFor={`kr-target-${objectiveId}`}>Target</Label>
              <Input
                id={`kr-target-${objectiveId}`}
                type="number"
                placeholder="100"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`kr-unit-${objectiveId}`}>Unit</Label>
              <Input
                id={`kr-unit-${objectiveId}`}
                placeholder="e.g. %, ms, users"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Owner</Label>
              <Select value={ownerIdx} onValueChange={setOwnerIdx}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Owner" />
                </SelectTrigger>
                <SelectContent>
                  {ownerOptions.map((o, i) => (
                    <SelectItem key={o.initials} value={String(i)}>
                      <span className="flex items-center gap-2">
                        <Avatar className="size-5 border border-border">
                          <AvatarFallback className="text-[8px] font-semibold bg-secondary text-foreground/70">
                            {o.initials}
                          </AvatarFallback>
                        </Avatar>
                        {o.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!title.trim() || !target}>
              Add Key Result
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// --- Inline Edit for KR Progress ---

function InlineProgressEdit({
  kr,
  onUpdate,
}: {
  kr: KeyResult
  onUpdate: (current: number, confidence: number) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [currentVal, setCurrentVal] = React.useState(String(kr.current))
  const [confidenceVal, setConfidenceVal] = React.useState(String(kr.confidence))

  function handleSave() {
    const newCurrent = parseFloat(currentVal)
    const newConfidence = Math.max(0, Math.min(10, parseInt(confidenceVal)))
    if (isNaN(newCurrent) || isNaN(newConfidence)) return
    onUpdate(newCurrent, newConfidence)
    setEditing(false)
    toast.success("Progress updated")
  }

  function handleCancel() {
    setCurrentVal(String(kr.current))
    setConfidenceVal(String(kr.confidence))
    setEditing(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setEditing(true)
        }}
        className="flex items-center gap-1 text-xs text-foreground/70 font-mono shrink-0 hover:text-foreground cursor-pointer transition-colors group/edit"
        title="Click to update progress"
      >
        {kr.current}
        <span className="text-muted-foreground"> / {kr.target} {kr.unit}</span>
        <PencilIcon className="size-3 text-muted-foreground opacity-0 group-hover/edit:opacity-100 transition-opacity ml-0.5" />
      </button>
    )
  }

  return (
    <span className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
      <Input
        type="number"
        value={currentVal}
        onChange={(e) => setCurrentVal(e.target.value)}
        className="h-6 w-16 text-xs font-mono px-1.5"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave()
          if (e.key === "Escape") handleCancel()
        }}
      />
      <span className="text-xs text-muted-foreground">/ {kr.target} {kr.unit}</span>
      <span className="text-[10px] text-muted-foreground mx-0.5">conf:</span>
      <Input
        type="number"
        min={0}
        max={10}
        value={confidenceVal}
        onChange={(e) => setConfidenceVal(e.target.value)}
        className="h-6 w-12 text-xs font-mono px-1.5"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave()
          if (e.key === "Escape") handleCancel()
        }}
      />
      <Button size="icon-xs" variant="ghost" onClick={handleSave}>
        <CheckIcon className="size-3 text-primary" />
      </Button>
      <Button size="icon-xs" variant="ghost" onClick={handleCancel}>
        <XIcon className="size-3 text-muted-foreground" />
      </Button>
    </span>
  )
}

// --- Components ---

function SummaryStats({ items }: { items: Objective[] }) {
  const onTrack = items.filter((o) => o.status === "on-track").length
  const atRisk = items.filter((o) => o.status === "at-risk").length
  const behind = items.filter((o) => o.status === "behind").length
  const completed = items.filter((o) => o.status === "completed").length
  const notStarted = items.filter((o) => o.status === "not-started").length

  const stats = [
    { label: "On Track", count: onTrack, color: "bg-primary" },
    { label: "At Risk", count: atRisk, color: "bg-amber-400" },
    { label: "Behind", count: behind, color: "bg-red-400" },
    { label: "Completed", count: completed, color: "bg-primary/50" },
    { label: "Not Started", count: notStarted, color: "bg-muted-foreground" },
  ].filter((s) => s.count > 0)

  const total = items.length

  return (
    <div className="flex items-center gap-6">
      <div className="flex h-2.5 w-44 overflow-hidden rounded-full bg-secondary">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`${s.color} transition-all`}
            style={{ width: `${(s.count / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex items-center gap-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${s.color}`} />
            <span className="text-xs text-muted-foreground">
              {s.count} {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ObjectiveRow({
  objective,
  onAddKeyResult,
  onDeleteObjective,
  onDeleteKeyResult,
  onUpdateKeyResult,
}: {
  objective: Objective
  onAddKeyResult: (objId: string, kr: KeyResult) => void
  onDeleteObjective: (objId: string) => void
  onDeleteKeyResult: (objId: string, krId: string) => void
  onUpdateKeyResult: (objId: string, krId: string, current: number, confidence: number) => void
}) {
  const [open, setOpen] = React.useState(
    objective.status !== "completed" && objective.status !== "not-started"
  )
  const progress = getObjectiveProgress(objective)
  const rag = ragConfig[objective.status]
  const completedKRs = objective.keyResults.filter(
    (kr) => kr.status === "completed"
  ).length

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm shadow-black/20 group/obj">
      {/* Objective header row */}
      <div className="flex w-full items-center gap-3 px-5 py-3.5 text-left">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex flex-1 items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer min-w-0"
        >
          <ChevronRightIcon
            className={`size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-90" : ""
            }`}
          />
          <span
            className={`size-2.5 shrink-0 rounded-full ${rag.dot} shadow-[0_0_6px_1px] shadow-current/30`}
            title={rag.label}
          />
          <span className="flex-1 text-[15px] font-semibold tracking-tight truncate">
            {objective.title}
          </span>
        </button>

        {/* KR count */}
        <span className="text-xs text-muted-foreground shrink-0 font-medium">
          {completedKRs}/{objective.keyResults.length} KRs
        </span>

        {/* Progress bar */}
        <div className="w-28 shrink-0">
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getProgressBarColor(objective.status)}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Progress % */}
        <span className={`w-12 text-right text-sm font-mono font-semibold ${rag.color}`}>
          {progress}%
        </span>

        {/* Owner */}
        <Avatar className="size-7 shrink-0 border border-border">
          <AvatarFallback className="text-[10px] font-semibold bg-secondary text-foreground/70">
            {objective.owner.initials}
          </AvatarFallback>
        </Avatar>

        {/* Time period badge */}
        <Badge variant="outline" className="shrink-0 text-[10px] px-2 py-0.5 h-5 text-muted-foreground border-border font-medium">
          {objective.timePeriod}
        </Badge>

        {/* Delete button */}
        <Button
          size="icon-xs"
          variant="ghost"
          className="shrink-0 opacity-0 group-hover/obj:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
          onClick={(e) => {
            e.stopPropagation()
            onDeleteObjective(objective.id)
          }}
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </div>

      {/* Key Results */}
      {open && (
        <div className="border-t border-border bg-background/50 rounded-b-xl">
          {objective.keyResults.map((kr, i) => (
            <KeyResultRow
              key={kr.id}
              kr={kr}
              isLast={i === objective.keyResults.length - 1 && objective.status === "completed"}
              onDelete={() => onDeleteKeyResult(objective.id, kr.id)}
              onUpdate={(current, confidence) =>
                onUpdateKeyResult(objective.id, kr.id, current, confidence)
              }
            />
          ))}
          {/* Add KR button */}
          <AddKeyResultDialog
            objectiveId={objective.id}
            onAddKeyResult={onAddKeyResult}
          />
        </div>
      )}
    </div>
  )
}

function KeyResultRow({
  kr,
  isLast,
  onDelete,
  onUpdate,
}: {
  kr: KeyResult
  isLast: boolean
  onDelete: () => void
  onUpdate: (current: number, confidence: number) => void
}) {
  const progress = getProgress(kr)
  const rag = ragConfig[kr.status]

  return (
    <div
      className={`flex items-center gap-3 px-5 py-3 pl-12 hover:bg-secondary/30 transition-colors group/kr ${
        !isLast ? "border-b border-border/50" : ""
      }`}
    >
      {/* Status dot */}
      <CircleIcon className={`size-2.5 shrink-0 fill-current ${rag.color}`} />

      {/* Title */}
      <span className="flex-1 text-sm text-foreground/90 truncate">
        {kr.title}
      </span>

      {/* Current / Target — inline editable */}
      <InlineProgressEdit kr={kr} onUpdate={onUpdate} />

      {/* Progress bar */}
      <div className="w-24 shrink-0">
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getProgressBarColor(kr.status)}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Confidence */}
      <span className="flex items-center gap-1 shrink-0" title={`Confidence: ${kr.confidence}/10`}>
        <TrendIcon confidence={kr.confidence} />
        <span className={`text-xs font-mono font-medium ${getConfidenceColor(kr.confidence)}`}>
          {kr.confidence}/10
        </span>
      </span>

      {/* Owner */}
      <Avatar className="size-6 shrink-0 border border-border">
        <AvatarFallback className="text-[9px] font-semibold bg-secondary text-foreground/70">
          {kr.owner.initials}
        </AvatarFallback>
      </Avatar>

      {/* Updated */}
      <span className="text-xs text-muted-foreground w-12 text-right shrink-0">
        {kr.updatedAt}
      </span>

      {/* Delete */}
      <Button
        size="icon-xs"
        variant="ghost"
        className="shrink-0 opacity-0 group-hover/kr:opacity-100 transition-opacity text-muted-foreground hover:text-red-400"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2Icon className="size-3" />
      </Button>
    </div>
  )
}

// --- Helpers to derive status from KRs ---

function deriveObjectiveStatus(obj: Objective): RAGStatus {
  const krs = obj.keyResults
  if (krs.length === 0) return obj.status

  const allCompleted = krs.every((kr) => kr.status === "completed")
  if (allCompleted) return "completed"

  const allNotStarted = krs.every((kr) => kr.status === "not-started")
  if (allNotStarted) return "not-started"

  const hasBehind = krs.some((kr) => kr.status === "behind")
  if (hasBehind) return "behind"

  const hasAtRisk = krs.some((kr) => kr.status === "at-risk")
  if (hasAtRisk) return "at-risk"

  return "on-track"
}

function deriveKRStatus(kr: KeyResult, newCurrent: number): RAGStatus {
  const progress = kr.target === 0 ? 100 : (newCurrent / kr.target) * 100
  if (newCurrent >= kr.target) return "completed"
  if (progress >= 70) return "on-track"
  if (progress >= 40) return "at-risk"
  if (progress > 0) return "behind"
  return "not-started"
}

// --- Page ---

export default function ObjectivesPage() {
  const [filter, setFilter] = React.useState("all")
  const [objectives, setObjectives] = React.useState<Objective[]>(initialObjectives)

  const filtered = React.useMemo(() => {
    if (filter === "all") return objectives
    return objectives.filter((o) => o.status === filter)
  }, [filter, objectives])

  function handleCreateObjective(obj: Objective) {
    setObjectives((prev) => [obj, ...prev])
  }

  function handleAddKeyResult(objId: string, kr: KeyResult) {
    setObjectives((prev) =>
      prev.map((obj) => {
        if (obj.id !== objId) return obj
        const updated = { ...obj, keyResults: [...obj.keyResults, kr] }
        updated.status = deriveObjectiveStatus(updated)
        return updated
      })
    )
  }

  function handleDeleteObjective(objId: string) {
    setObjectives((prev) => prev.filter((o) => o.id !== objId))
    toast("Objective removed")
  }

  function handleDeleteKeyResult(objId: string, krId: string) {
    setObjectives((prev) =>
      prev.map((obj) => {
        if (obj.id !== objId) return obj
        const updated = { ...obj, keyResults: obj.keyResults.filter((kr) => kr.id !== krId) }
        updated.status = deriveObjectiveStatus(updated)
        return updated
      })
    )
    toast("Key Result removed")
  }

  function handleUpdateKeyResult(objId: string, krId: string, current: number, confidence: number) {
    setObjectives((prev) =>
      prev.map((obj) => {
        if (obj.id !== objId) return obj
        const updated = {
          ...obj,
          keyResults: obj.keyResults.map((kr) => {
            if (kr.id !== krId) return kr
            const newStatus = deriveKRStatus(kr, current)
            return { ...kr, current, confidence, status: newStatus, updatedAt: "just now" }
          }),
        }
        updated.status = deriveObjectiveStatus(updated)
        return updated
      })
    )
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Objectives" />
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Objectives & Key Results</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Q1 2026 · Track goals across your agent network
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarIcon className="size-3.5" />
                <span>Jan 1 — Mar 31, 2026</span>
              </div>
              <CreateObjectiveDialog onCreateObjective={handleCreateObjective} />
            </div>
          </div>

          {/* Summary bar */}
          <div className="mb-5">
            <SummaryStats items={objectives} />
          </div>

          <Separator className="mb-5" />

          {/* Filter tabs */}
          <Tabs value={filter} onValueChange={setFilter} className="mb-5">
            <TabsList className="h-8 bg-muted/50">
              <TabsTrigger value="all" className="text-xs px-3 h-6">
                All ({objectives.length})
              </TabsTrigger>
              <TabsTrigger value="on-track" className="text-xs px-3 h-6">
                On Track
              </TabsTrigger>
              <TabsTrigger value="at-risk" className="text-xs px-3 h-6">
                At Risk
              </TabsTrigger>
              <TabsTrigger value="behind" className="text-xs px-3 h-6">
                Behind
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs px-3 h-6">
                Completed
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Objective list */}
          <div className="space-y-2">
            {filtered.map((obj) => (
              <ObjectiveRow
                key={obj.id}
                objective={obj}
                onAddKeyResult={handleAddKeyResult}
                onDeleteObjective={handleDeleteObjective}
                onDeleteKeyResult={handleDeleteKeyResult}
                onUpdateKeyResult={handleUpdateKeyResult}
              />
            ))}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No objectives match this filter.
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
      <Toaster theme="dark" position="bottom-right" />
    </SidebarProvider>
  )
}
