"use client"

import { useState } from "react"
import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ActionBarPrimitive,
  AuiIf,
  useAuiState,
  useLocalRuntime,
  AssistantRuntimeProvider,
  type ChatModelAdapter,
} from "@assistant-ui/react"
import { MarkdownText } from "@/components/assistant-ui/markdown-text"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import {
  XIcon,
  ArrowUpIcon,
  CopyIcon,
  CheckIcon,
  RefreshCwIcon,
  SquareIcon,
  MessageSquareIcon,
  WrenchIcon,
  FileIcon,
  ScrollTextIcon,
  CodeIcon,
  FileTextIcon,
  ImageIcon,
  DatabaseIcon,
  GlobeIcon,
  TerminalIcon,
  FileSearchIcon,
  BarChart3Icon,
  LanguagesIcon,
  GitPullRequestIcon,
  PlusIcon,
  TrashIcon,
  TargetIcon,
  CheckCircleIcon,
  XCircleIcon,
  CircleDotIcon,
  UserIcon,
  BotIcon,
} from "lucide-react"
import type { Objective, KeyResult, ThreadSkill, ThreadArtifact, KRStatus } from "@/lib/mock-data"
import { THREAD_SKILLS, AGENTS } from "@/lib/mock-data"
import type { FC } from "react"

// ─── Icon resolver ──────────────────────────────────────────
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

const ARTIFACT_TYPE_ICONS: Record<string, FC<{ className?: string }>> = {
  code: CodeIcon,
  document: FileTextIcon,
  image: ImageIcon,
  data: DatabaseIcon,
}

const STATUS_CONFIG: Record<string, { color: string; dot: string }> = {
  "On Track": { color: "text-primary", dot: "bg-primary" },
  "At Risk": { color: "text-amber-400", dot: "bg-amber-400" },
  Behind: { color: "text-red-400", dot: "bg-red-400" },
  Completed: { color: "text-primary", dot: "bg-primary" },
  "Not Started": { color: "text-muted-foreground", dot: "bg-muted-foreground" },
}

const KR_STATUS_CONFIG: Record<KRStatus, { label: string; color: string; icon: FC<{ className?: string }> }> = {
  proposed: { label: "Proposed", color: "text-amber-400 border-amber-400/30", icon: CircleDotIcon },
  approved: { label: "Approved", color: "text-primary border-primary/30", icon: CheckCircleIcon },
  rejected: { label: "Rejected", color: "text-red-400 border-red-400/30", icon: XCircleIcon },
  completed: { label: "Completed", color: "text-primary border-primary/30", icon: CheckCircleIcon },
}

// ─── Chat Adapter ───────────────────────────────────────────
function createObjectiveChatAdapter(objective: Objective): ChatModelAdapter {
  const aiAgent = AGENTS.find((a) => a.id === objective.aiOwner)
  const agentName = aiAgent?.name ?? "Agent"
  let msgCount = 0

  return {
    async *run({ messages }) {
      const lastMsg = messages.filter((m) => m.role === "user").at(-1)?.content ?? []
      const text = lastMsg
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ")

      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300))
      msgCount++

      const krProposal = msgCount % 3 === 0
        ? `\n\n---\n**Proposed Key Result:** Based on this discussion, I recommend adding:\n> *"${text.slice(0, 50)}..."*\nTarget: TBD | Unit: TBD | Confidence: 7/10\n\nPlease review and approve in the **Key Results** tab.`
        : ""

      yield {
        content: [
          {
            type: "text" as const,
            text: `**${agentName}:** I've analyzed this in context of "${objective.title}". ${text.length > 30 ? `Regarding "${text.slice(0, 30)}..."` : `On "${text}"`} — let me check against our current key results and get back with findings.${krProposal}`,
          },
        ],
      }
    },
  }
}

// ─── Chat Components ────────────────────────────────────────
const ObjChatMessage: FC = () => {
  const role = useAuiState((s) => s.message.role)
  if (role === "user") return <ObjUserMessage />
  return <ObjAssistantMessage />
}

const ObjUserMessage: FC = () => (
  <MessagePrimitive.Root className="px-3 py-1.5" data-role="user">
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-amber-400/15 text-[10px] font-semibold text-amber-400">
        <UserIcon className="size-3" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-medium text-amber-400">Human Owner</span>
        <div className="text-[13px] leading-relaxed text-foreground mt-0.5">
          <MessagePrimitive.Parts />
        </div>
      </div>
    </div>
  </MessagePrimitive.Root>
)

const ObjAssistantMessage: FC = () => (
  <MessagePrimitive.Root className="group px-3 py-1.5" data-role="assistant">
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-[10px] font-semibold text-primary">
        <BotIcon className="size-3" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] leading-relaxed text-foreground">
          <MessagePrimitive.Parts>
            {({ part }) => {
              if (part.type === "text") return <MarkdownText />
              return null
            }}
          </MessagePrimitive.Parts>
        </div>
        <div className="mt-0.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <ActionBarPrimitive.Root hideWhenRunning className="flex items-center gap-1 text-muted-foreground">
            <ActionBarPrimitive.Copy className="flex size-5 items-center justify-center rounded hover:bg-muted">
              <AuiIf condition={(s) => s.message.isCopied}><CheckIcon className="size-2.5" /></AuiIf>
              <AuiIf condition={(s) => !s.message.isCopied}><CopyIcon className="size-2.5" /></AuiIf>
            </ActionBarPrimitive.Copy>
            <ActionBarPrimitive.Reload className="flex size-5 items-center justify-center rounded hover:bg-muted">
              <RefreshCwIcon className="size-2.5" />
            </ActionBarPrimitive.Reload>
          </ActionBarPrimitive.Root>
        </div>
      </div>
    </div>
  </MessagePrimitive.Root>
)

const ObjComposer: FC = () => (
  <ComposerPrimitive.Root className="flex flex-col rounded-xl border border-border bg-card p-1">
    <ComposerPrimitive.Input
      placeholder="Message AI owner..."
      className="min-h-[2rem] w-full resize-none bg-transparent px-2.5 py-1.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
      rows={1}
    />
    <div className="flex items-center justify-end px-1.5 pb-0.5">
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30">
          <ArrowUpIcon className="size-3.5" />
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel className="flex size-7 items-center justify-center rounded-lg bg-destructive text-white transition-colors hover:bg-destructive/90">
          <SquareIcon className="size-2.5 fill-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  </ComposerPrimitive.Root>
)

// ─── Chat Tab ───────────────────────────────────────────────
const ChatTab: FC<{ objective: Objective }> = ({ objective }) => {
  const [adapter] = useState(() => createObjectiveChatAdapter(objective))
  const runtime = useLocalRuntime(adapter)

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="flex h-full flex-col">
        <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-scroll scroll-smooth">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <div className="flex flex-col items-center justify-center px-4 py-8">
              <MessageSquareIcon className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground text-center">
                Start a conversation about this objective.
              </p>
            </div>
          </AuiIf>
          <ThreadPrimitive.Messages>
            {() => <ObjChatMessage />}
          </ThreadPrimitive.Messages>
          <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-background px-3 pb-3 pt-1">
            <ObjComposer />
          </ThreadPrimitive.ViewportFooter>
        </ThreadPrimitive.Viewport>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  )
}

// ─── Key Results Tab ────────────────────────────────────────
function KeyResultsTab({
  objective,
  onUpdateKR,
}: {
  objective: Objective
  onUpdateKR: (krId: string, status: KRStatus) => void
}) {
  const proposed = objective.keyResults.filter((kr) => kr.status === "proposed")
  const active = objective.keyResults.filter((kr) => kr.status === "approved" || kr.status === "completed")
  const rejected = objective.keyResults.filter((kr) => kr.status === "rejected")

  function renderKR(kr: KeyResult) {
    const cfg = KR_STATUS_CONFIG[kr.status]
    const StatusIcon = cfg.icon
    const proposer = AGENTS.find((a) => a.id === kr.proposedBy)

    return (
      <div key={kr.id} className="rounded-lg border p-3">
        <div className="flex items-start gap-2">
          <StatusIcon className={`size-4 mt-0.5 shrink-0 ${cfg.color.split(" ")[0]}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-snug">{kr.title}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="outline" className={`text-[10px] h-5 ${cfg.color}`}>
                {cfg.label}
              </Badge>
              {kr.current && kr.target && (
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {kr.current} / {kr.target} {kr.unit}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">
                Confidence: {kr.confidence}/10
              </span>
            </div>
            {/* Progress bar */}
            {kr.progress > 0 && (
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    kr.status === "completed" ? "bg-primary" : kr.progress >= 70 ? "bg-primary" : kr.progress >= 40 ? "bg-amber-400" : "bg-red-400"
                  }`}
                  style={{ width: `${kr.progress}%` }}
                />
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-muted-foreground">
                Proposed by {proposer?.name ?? kr.proposedBy} · {kr.proposedAt}
              </span>
              {kr.owner && (
                <span className="text-[10px] text-muted-foreground">
                  · Owner: {kr.owner}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Approve/Reject actions for proposed KRs */}
        {kr.status === "proposed" && (
          <div className="flex items-center gap-2 mt-3 pl-6">
            <Button
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => onUpdateKR(kr.id, "approved")}
            >
              <CheckIcon className="size-3" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-red-400 hover:text-red-300"
              onClick={() => onUpdateKR(kr.id, "rejected")}
            >
              <XIcon className="size-3" />
              Reject
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Proposed (needs attention) */}
      {proposed.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-amber-400">
              Needs Review
            </span>
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {proposed.length}
            </Badge>
          </div>
          {proposed.map(renderKR)}
        </>
      )}

      {/* Active KRs */}
      {active.length > 0 && (
        <>
          {proposed.length > 0 && <Separator />}
          <span className="text-xs font-medium text-muted-foreground">
            Active Key Results ({active.length})
          </span>
          {active.map(renderKR)}
        </>
      )}

      {/* Rejected */}
      {rejected.length > 0 && (
        <>
          <Separator />
          <span className="text-xs font-medium text-muted-foreground">
            Rejected ({rejected.length})
          </span>
          {rejected.map(renderKR)}
        </>
      )}

      {objective.keyResults.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <TargetIcon className="size-8 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            No key results yet. The AI owner will propose them.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Skills Tab ─────────────────────────────────────────────
function SkillsTab({ objective }: { objective: Objective }) {
  const [skills, setSkills] = useState<ThreadSkill[]>(objective.skills)
  const [showCatalog, setShowCatalog] = useState(false)

  const availableSkills = THREAD_SKILLS.filter(
    (s) => !skills.some((ts) => ts.id === s.id)
  )

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {skills.length} skill{skills.length !== 1 ? "s" : ""} attached
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCatalog(!showCatalog)}>
          <PlusIcon className="size-3 mr-1" />
          Add
        </Button>
      </div>
      {skills.map((skill) => {
        const Icon = SKILL_ICONS[skill.icon] ?? WrenchIcon
        return (
          <div key={skill.id} className="flex items-start gap-3 rounded-lg border p-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Icon className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{skill.name}</span>
              <p className="text-xs text-muted-foreground mt-0.5">{skill.description}</p>
            </div>
            <Button variant="ghost" size="icon-sm" className="shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setSkills(skills.filter((s) => s.id !== skill.id))}>
              <TrashIcon className="size-3" />
            </Button>
          </div>
        )
      })}
      {showCatalog && availableSkills.length > 0 && (
        <>
          <Separator />
          <span className="text-xs font-medium text-muted-foreground">Available skills</span>
          <div className="grid grid-cols-2 gap-2">
            {availableSkills.map((skill) => {
              const Icon = SKILL_ICONS[skill.icon] ?? WrenchIcon
              return (
                <button key={skill.id} className="flex items-center gap-2 rounded-lg border border-dashed p-2 text-left transition-colors hover:bg-muted/50" onClick={() => setSkills([...skills, skill])}>
                  <Icon className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{skill.name}</span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Artifacts Tab ──────────────────────────────────────────
function ArtifactsTab({ objective }: { objective: Objective }) {
  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {objective.artifacts.length} artifact{objective.artifacts.length !== 1 ? "s" : ""}
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-xs">
          <PlusIcon className="size-3 mr-1" />
          Upload
        </Button>
      </div>
      {objective.artifacts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <FileIcon className="size-8 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">No artifacts shared yet</p>
        </div>
      )}
      {objective.artifacts.map((artifact) => {
        const Icon = ARTIFACT_TYPE_ICONS[artifact.type] ?? FileIcon
        return (
          <div key={artifact.id} className="flex items-center gap-3 rounded-lg border p-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium truncate block">{artifact.name}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{artifact.type}</Badge>
                <span className="text-[10px] text-muted-foreground">by {artifact.addedBy} · {artifact.addedAt}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Instructions Tab ───────────────────────────────────────
function InstructionsTab({ objective }: { objective: Objective }) {
  const [instructions, setInstructions] = useState(objective.instructions)
  const [editing, setEditing] = useState(false)

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Shared instructions</span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditing(!editing)}>
          {editing ? "Done" : "Edit"}
        </Button>
      </div>
      {editing ? (
        <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="min-h-[120px] text-[13px] resize-none" placeholder="Add instructions for agents..." />
      ) : (
        <div className="rounded-lg border bg-muted/30 p-3">
          {instructions ? (
            <p className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap">{instructions}</p>
          ) : (
            <p className="text-[13px] text-muted-foreground italic">No instructions set.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Panel ─────────────────────────────────────────────
export function ChannelObjectivePanel({
  objective,
  onClose,
  onUpdateObjective,
}: {
  objective: Objective
  onClose: () => void
  onUpdateObjective: (updated: Objective) => void
}) {
  const aiAgent = AGENTS.find((a) => a.id === objective.aiOwner)
  const statusCfg = STATUS_CONFIG[objective.status] ?? STATUS_CONFIG["Not Started"]
  const proposedCount = objective.keyResults.filter((kr) => kr.status === "proposed").length

  function handleUpdateKR(krId: string, status: KRStatus) {
    const updatedKRs = objective.keyResults.map((kr) =>
      kr.id === krId ? { ...kr, status, approvedBy: status === "approved" ? objective.humanOwner : undefined } : kr
    )
    onUpdateObjective({ ...objective, keyResults: updatedKRs })
  }

  return (
    <div className="flex h-full w-[440px] shrink-0 flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`size-2 rounded-full ${statusCfg.dot}`} />
            <h3 className="text-sm font-semibold truncate">{objective.title}</h3>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            {/* Human Owner */}
            <div className="flex items-center gap-1">
              <div className="flex size-5 items-center justify-center rounded-full bg-amber-400/15">
                <UserIcon className="size-3 text-amber-400" />
              </div>
              <span className="text-[10px] text-muted-foreground">{objective.humanOwner}</span>
            </div>
            {/* AI Owner */}
            <div className="flex items-center gap-1">
              <div className="flex size-5 items-center justify-center rounded-full bg-primary/15">
                <BotIcon className="size-3 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground">{aiAgent?.name ?? objective.aiOwner}</span>
            </div>
            {/* Status */}
            <Badge variant="outline" className={`text-[10px] h-5 ${statusCfg.color}`}>
              {objective.status}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <XIcon className="size-4" />
        </Button>
      </div>

      {/* Tabbed Content */}
      <Tabs defaultValue="chat" className="flex flex-1 flex-col min-h-0">
        <TabsList variant="line" className="w-full shrink-0 border-b px-2">
          <TabsTrigger value="chat" className="gap-1 text-xs">
            <MessageSquareIcon className="size-3" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="key-results" className="gap-1 text-xs">
            <TargetIcon className="size-3" />
            Key Results
            {proposedCount > 0 && (
              <Badge className="ml-0.5 h-4 px-1 text-[10px] bg-amber-400/20 text-amber-400 border-amber-400/30">
                {proposedCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-1 text-xs">
            <WrenchIcon className="size-3" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="artifacts" className="gap-1 text-xs">
            <FileIcon className="size-3" />
            Files
          </TabsTrigger>
          <TabsTrigger value="instructions" className="gap-1 text-xs">
            <ScrollTextIcon className="size-3" />
            Inst.
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 min-h-0">
          <ChatTab objective={objective} />
        </TabsContent>
        <TabsContent value="key-results" className="flex-1 overflow-y-auto">
          <KeyResultsTab objective={objective} onUpdateKR={handleUpdateKR} />
        </TabsContent>
        <TabsContent value="skills" className="flex-1 overflow-y-auto">
          <SkillsTab objective={objective} />
        </TabsContent>
        <TabsContent value="artifacts" className="flex-1 overflow-y-auto">
          <ArtifactsTab objective={objective} />
        </TabsContent>
        <TabsContent value="instructions" className="flex-1 overflow-y-auto">
          <InstructionsTab objective={objective} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
