// @ts-nocheck
"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PlusIcon,
  WrenchIcon,
  GlobeIcon,
  TerminalIcon,
  FileSearchIcon,
  BarChart3Icon,
  FileTextIcon,
  LanguagesIcon,
  GitPullRequestIcon,
  ImageIcon,
  UserIcon,
  BotIcon,
} from "lucide-react"
import { THREAD_SKILLS, AGENTS, type Objective, type ThreadSkill } from "@/lib/mock-data"
import type { FC } from "react"

const SKILL_ICONS: Record<string, FC<{ className?: string }>> = {
  Globe: GlobeIcon,
  Terminal: TerminalIcon,
  FileSearch: FileSearchIcon,
  BarChart3: BarChart3Icon,
  FileText: FileTextIcon,
  Languages: LanguagesIcon,
  GitPullRequest: GitPullRequestIcon,
  Image: ImageIcon,
}

const TIME_PERIODS = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"]

export function NewObjectiveDialog({
  channelId,
  onCreateObjective,
  children,
}: {
  channelId: string
  onCreateObjective: (objective: Objective) => void
  children: React.ReactElement
}) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [aiOwner, setAiOwner] = useState("")
  const [timePeriod, setTimePeriod] = useState("Q1 2026")
  const [instructions, setInstructions] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<ThreadSkill[]>([])

  const channelAgents = AGENTS.filter((a) => a.channels.includes(channelId))

  function toggleSkill(skill: ThreadSkill) {
    setSelectedSkills((prev) =>
      prev.some((s) => s.id === skill.id)
        ? prev.filter((s) => s.id !== skill.id)
        : [...prev, skill]
    )
  }

  function handleCreate() {
    if (!title.trim() || !aiOwner) return

    const newObjective: Objective = {
      id: `obj-${Date.now()}`,
      channelId,
      title: title.trim(),
      humanOwner: "xo",
      humanOwnerInitials: "XO",
      aiOwner,
      status: "Not Started",
      progress: 0,
      timePeriod,
      createdAt: "just now",
      lastActivity: "just now",
      keyResults: [],
      skills: selectedSkills,
      artifacts: [],
      instructions,
    }

    onCreateObjective(newObjective)
    setOpen(false)
    setTitle("")
    setAiOwner("")
    setTimePeriod("Q1 2026")
    setInstructions("")
    setSelectedSkills([])
  }

  return (
    <>
      {React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
        onClick: () => setOpen(true),
      })}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Objective</DialogTitle>
            <DialogDescription>
              Create an objective with a human owner and AI agent to drive key results.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obj-title" className="text-xs">Objective</Label>
              <Input
                id="obj-title"
                placeholder="e.g. Improve platform reliability"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Owners */}
            <div className="grid grid-cols-2 gap-3">
              {/* Human Owner */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <UserIcon className="size-3 text-amber-400" />
                  Human Owner
                </Label>
                <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <div className="flex size-5 items-center justify-center rounded-full bg-amber-400/15">
                    <UserIcon className="size-3 text-amber-400" />
                  </div>
                  <span className="text-sm">xo</span>
                </div>
              </div>

              {/* AI Owner */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <BotIcon className="size-3 text-primary" />
                  AI Owner
                </Label>
                <Select value={aiOwner} onValueChange={(v) => setAiOwner(v ?? "")}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {channelAgents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <span>{agent.name}</span>
                            <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                              {agent.role}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time Period */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Time Period</Label>
              <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v ?? "")}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TIME_PERIODS.map((tp) => (
                      <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Skills */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Skills</Label>
              <div className="flex flex-wrap gap-1.5">
                {THREAD_SKILLS.map((skill) => {
                  const isSelected = selectedSkills.some((s) => s.id === skill.id)
                  const Icon = SKILL_ICONS[skill.icon] ?? WrenchIcon
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="size-3" />
                      {skill.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Instructions */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="obj-instructions" className="text-xs">Instructions</Label>
              <Textarea
                id="obj-instructions"
                placeholder="Instructions for the AI owner..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="min-h-[80px] resize-none text-[13px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={!title.trim() || !aiOwner}
              className="w-full sm:w-auto"
            >
              <PlusIcon className="size-3.5 mr-1.5" />
              Create Objective
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
