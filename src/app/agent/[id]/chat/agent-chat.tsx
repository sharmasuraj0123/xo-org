"use client"

import { useEffect, useRef, useCallback } from "react"
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
import {
  ArrowUpIcon,
  PaperclipIcon,
  CopyIcon,
  CheckIcon,
  RefreshCwIcon,
  SquareIcon,
  CpuIcon,
  HashIcon,
  TargetIcon,
  ActivityIcon,
  ClockIcon,
  CheckCircle2Icon,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarBadge } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { OBJECTIVES, type Agent, type AgentRole } from "@/lib/mock-data"
import {
  getSessionMessages,
  appendSessionMessage,
  ensureSessionMeta,
  type StoredMessage,
} from "@/lib/session-store"
import type { FC } from "react"

const ROLE_STYLES: Record<AgentRole, { bg: string; text: string }> = {
  Research:    { bg: "bg-blue-500/20",   text: "text-blue-400" },
  Engineering: { bg: "bg-primary/20",    text: "text-primary" },
  DevOps:      { bg: "bg-orange-400/20", text: "text-orange-400" },
  Design:      { bg: "bg-purple-400/20", text: "text-purple-400" },
  Product:     { bg: "bg-cyan-400/20",   text: "text-cyan-400" },
  Analytics:   { bg: "bg-yellow-400/20", text: "text-yellow-400" },
  Security:    { bg: "bg-red-400/20",    text: "text-red-400" },
  Support:     { bg: "bg-teal-400/20",   text: "text-teal-400" },
}

const STATUS_BADGE: Record<Agent["status"], string> = {
  active:  "bg-primary",
  idle:    "bg-amber-400",
  offline: "bg-muted-foreground/30",
}

// --- Chat adapter with localStorage persistence ---

function createAgentAdapter(agent: Agent, sessionId: string): ChatModelAdapter {
  const roleResponses: Record<string, (msg: string) => string> = {
    Research: (msg) => `I've looked into "${msg}" — let me pull together the relevant findings and data points for you.`,
    Engineering: (msg) => `On it. I'll start working on "${msg}" and push a branch when ready for review.`,
    DevOps: (msg) => `Checking infrastructure for "${msg}". I'll run diagnostics and report back with the status.`,
    Design: (msg) => `Great prompt. I'll explore some visual directions for "${msg}" and share mockups shortly.`,
    Product: (msg) => `Interesting. Let me analyze the user impact of "${msg}" and draft a brief proposal.`,
    Analytics: (msg) => `I'll crunch the numbers on "${msg}" and prepare a data summary for you.`,
    Security: (msg) => `Running a security assessment on "${msg}". I'll flag any vulnerabilities I find.`,
    Support: (msg) => `I'll look into "${msg}" and check our knowledge base for relevant solutions.`,
  }

  return {
    async *run({ messages }) {
      const lastUserMessage =
        messages.filter((m) => m.role === "user").at(-1)?.content ?? []
      const userText = lastUserMessage
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(" ")

      // Save user message to localStorage
      appendSessionMessage(sessionId, {
        id: `msg_${Date.now()}_user`,
        role: "user",
        text: userText,
        timestamp: Date.now(),
      })

      const responseFn = roleResponses[agent.role] ?? roleResponses.Research!
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600))

      const responseText = responseFn(userText)

      // Save assistant message to localStorage
      appendSessionMessage(sessionId, {
        id: `msg_${Date.now()}_assistant`,
        role: "assistant",
        text: responseText,
        timestamp: Date.now(),
      })

      yield {
        content: [{ type: "text" as const, text: responseText }],
      }
    },
  }
}

// --- Messages ---

const ChatMessage: FC<{ agent: Agent }> = ({ agent }) => {
  const role = useAuiState((s) => s.message.role)
  if (role === "user") return <UserMessage />
  return <AssistantMessage agent={agent} />
}

const UserMessage: FC = () => (
  <MessagePrimitive.Root className="px-4 py-2" data-role="user">
    <div className="flex items-start gap-3 max-w-3xl">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-[11px] font-semibold text-amber-400">
        XO
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-amber-400">xo</span>
        <div className="text-sm leading-relaxed text-foreground mt-0.5">
          <MessagePrimitive.Parts />
        </div>
      </div>
    </div>
  </MessagePrimitive.Root>
)

const AssistantMessage: FC<{ agent: Agent }> = ({ agent }) => {
  const role = ROLE_STYLES[agent.role]
  const initials = agent.name.slice(0, 2).toUpperCase()

  return (
    <MessagePrimitive.Root className="group px-4 py-2" data-role="assistant">
      <div className="flex items-start gap-3 max-w-3xl">
        <div
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold",
            role.bg, role.text
          )}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <span className={cn("text-xs font-medium", role.text)}>
            {agent.name}
          </span>
          <div className="text-sm leading-relaxed text-foreground mt-0.5">
            <MessagePrimitive.Parts>
              {({ part }) => {
                if (part.type === "text") return <MarkdownText />
                return null
              }}
            </MessagePrimitive.Parts>
          </div>
          <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <ActionBarPrimitive.Root
              hideWhenRunning
              className="flex items-center gap-1 text-muted-foreground"
            >
              <ActionBarPrimitive.Copy className="flex size-6 items-center justify-center rounded-md hover:bg-muted">
                <AuiIf condition={(s) => s.message.isCopied}>
                  <CheckIcon className="size-3" />
                </AuiIf>
                <AuiIf condition={(s) => !s.message.isCopied}>
                  <CopyIcon className="size-3" />
                </AuiIf>
              </ActionBarPrimitive.Copy>
              <ActionBarPrimitive.Reload className="flex size-6 items-center justify-center rounded-md hover:bg-muted">
                <RefreshCwIcon className="size-3" />
              </ActionBarPrimitive.Reload>
            </ActionBarPrimitive.Root>
          </div>
        </div>
      </div>
    </MessagePrimitive.Root>
  )
}

// --- Composer ---

const AgentComposer: FC<{ agentName: string }> = ({ agentName }) => (
  <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-border bg-card p-1 shadow-sm">
    <ComposerPrimitive.Input
      placeholder={`Message ${agentName}...`}
      className="min-h-[2.5rem] w-full resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
      rows={1}
      autoFocus
    />
    <div className="flex items-center justify-between px-2 pb-1">
      <div className="flex items-center gap-1">
        <ComposerPrimitive.AddAttachment className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
          <PaperclipIcon className="size-4" />
        </ComposerPrimitive.AddAttachment>
      </div>
      <div className="flex items-center gap-2">
        <AuiIf condition={(s) => !s.thread.isRunning}>
          <ComposerPrimitive.Send className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30">
            <ArrowUpIcon className="size-4" />
          </ComposerPrimitive.Send>
        </AuiIf>
        <AuiIf condition={(s) => s.thread.isRunning}>
          <ComposerPrimitive.Cancel className="flex size-8 items-center justify-center rounded-lg bg-destructive text-white transition-colors hover:bg-destructive/90">
            <SquareIcon className="size-3 fill-current" />
          </ComposerPrimitive.Cancel>
        </AuiIf>
      </div>
    </div>
  </ComposerPrimitive.Root>
)

// --- Restored messages display ---

const RestoredMessages: FC<{ messages: StoredMessage[]; agent: Agent }> = ({ messages, agent }) => {
  const role = ROLE_STYLES[agent.role]
  const initials = agent.name.slice(0, 2).toUpperCase()

  if (messages.length === 0) return null

  return (
    <div className="border-b border-border/30 pb-3 mb-2">
      <div className="px-4 py-2">
        <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Previous messages</span>
      </div>
      {messages.map((msg) => (
        <div key={msg.id} className="px-4 py-2 opacity-70" data-role={msg.role}>
          <div className="flex items-start gap-3 max-w-3xl">
            {msg.role === "user" ? (
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-[11px] font-semibold text-amber-400">
                XO
              </div>
            ) : (
              <div
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold",
                  role.bg, role.text
                )}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className={cn("text-xs font-medium", msg.role === "user" ? "text-amber-400" : role.text)}>
                {msg.role === "user" ? "xo" : agent.name}
              </span>
              <div className="text-sm leading-relaxed text-foreground mt-0.5">
                {msg.text}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Thread ---

const AgentThread: FC<{ agent: Agent; sessionId: string; restoredMessages: StoredMessage[] }> = ({
  agent,
  sessionId,
  restoredMessages,
}) => {
  const role = ROLE_STYLES[agent.role]
  const initials = agent.name.slice(0, 2).toUpperCase()

  return (
    <ThreadPrimitive.Root className="flex h-full flex-col bg-background">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-scroll scroll-smooth">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          {restoredMessages.length > 0 ? (
            <RestoredMessages messages={restoredMessages} agent={agent} />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-4">
              <Avatar className={cn("size-14 mb-4", role.bg)}>
                <AvatarFallback
                  className={cn("text-lg font-bold tracking-wide", role.bg, role.text)}
                >
                  {initials}
                </AvatarFallback>
                <AvatarBadge className={STATUS_BADGE[agent.status]} />
              </Avatar>
              <h1 className="text-xl font-semibold text-foreground">
                {agent.name}
              </h1>
              <p className={cn("text-sm font-medium mt-0.5", role.text)}>
                {agent.role}
              </p>
              <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                Send a message to start a conversation with {agent.name}.
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/40 font-mono">
                session: {sessionId}
              </p>
            </div>
          )}
        </AuiIf>

        <AuiIf condition={(s) => !s.thread.isEmpty}>
          {restoredMessages.length > 0 && (
            <RestoredMessages messages={restoredMessages} agent={agent} />
          )}
        </AuiIf>

        <ThreadPrimitive.Messages>
          {() => <ChatMessage agent={agent} />}
        </ThreadPrimitive.Messages>

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto bg-background px-4 pb-4 pt-2">
          <AgentComposer agentName={agent.name} />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  )
}

// --- Activity panel ---

const STATUS_LABEL: Record<Agent["status"], string> = {
  active: "Active",
  idle: "Idle",
  offline: "Offline",
}

function getActivityFeed(agent: Agent) {
  return [
    { time: "2m ago", action: "Completed task", detail: "Updated API documentation" },
    { time: "8m ago", action: "Sent message", detail: `Replied in #${agent.channels[0] ?? "general"}` },
    { time: "15m ago", action: "Started task", detail: agent.currentTask ?? "Processing queue" },
    { time: "32m ago", action: "Joined channel", detail: `#${agent.channels[agent.channels.length - 1] ?? "general"}` },
    { time: "1h ago", action: "Completed task", detail: "Ran regression suite" },
  ]
}

function ActivityPanel({ agent }: { agent: Agent }) {
  const objectives = OBJECTIVES.filter((o) => o.aiOwner === agent.id)
  const activities = getActivityFeed(agent)

  return (
    <div className="flex h-full flex-col overflow-y-auto border-l bg-background">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              agent.status === "active" && "bg-primary/10 text-primary border border-primary/20",
              agent.status === "idle" && "bg-amber-400/10 text-amber-400 border border-amber-400/20",
              agent.status === "offline" && "bg-muted/60 text-muted-foreground/60 border border-border"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full shrink-0",
                STATUS_BADGE[agent.status],
                agent.status === "active" && "animate-pulse"
              )}
            />
            {STATUS_LABEL[agent.status]}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70 ml-auto">
            <CpuIcon className="size-3 shrink-0" />
            <span className="font-mono">{agent.model}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {agent.currentTask && (
          <Card className="gap-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ActivityIcon className="size-3" />
                Current Task
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">
                {agent.currentTask}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">Tasks Done</div>
            <div className="text-lg font-semibold tabular-nums">{agent.tasksCompleted}</div>
          </div>
          <div className="rounded-lg border bg-card px-3 py-2">
            <div className="text-xs text-muted-foreground">Last Active</div>
            <div className="text-sm font-medium mt-0.5">{agent.lastActive}</div>
          </div>
        </div>

        {objectives.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
              <TargetIcon className="size-3" />
              Assigned Objectives
            </h3>
            <div className="space-y-2">
              {objectives.map((obj) => (
                <div key={obj.id} className="rounded-lg border bg-card p-3">
                  <div className="text-sm font-medium text-foreground leading-tight">
                    {obj.title}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          (obj.status === "Completed" || obj.status === "On Track") && "bg-primary",
                          obj.status === "At Risk" && "bg-amber-400",
                          obj.status === "Behind" && "bg-red-400",
                          obj.status === "Not Started" && "bg-muted-foreground/30"
                        )}
                        style={{ width: `${obj.progress}%` }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {obj.progress}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0",
                        obj.status === "On Track" && "border-primary/30 text-primary",
                        obj.status === "At Risk" && "border-amber-400/30 text-amber-400",
                        obj.status === "Behind" && "border-red-400/30 text-red-400",
                        obj.status === "Completed" && "border-primary/30 text-primary",
                        obj.status === "Not Started" && "border-border text-muted-foreground"
                      )}
                    >
                      {obj.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {obj.timePeriod}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
            <HashIcon className="size-3" />
            Channels
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {agent.channels.map((ch) => (
              <a
                key={ch}
                href={`/channel/${ch}`}
                className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <HashIcon className="size-2.5 shrink-0" />
                {ch}
              </a>
            ))}
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
            <ClockIcon className="size-3" />
            Recent Activity
          </h3>
          <div className="space-y-0">
            {activities.map((activity, i) => (
              <div
                key={i}
                className="flex items-start gap-2 py-2 border-b border-border/40 last:border-0"
              >
                <div className="mt-1">
                  <CheckCircle2Icon className="size-3 text-muted-foreground/50" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-foreground/80">{activity.action}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {activity.detail}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground/50 shrink-0">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Main export ---

export function AgentChat({ agent, sessionId }: { agent: Agent; sessionId?: string }) {
  // Use provided sessionId or generate a default one for the agent
  const activeSessionId = sessionId || `default-${agent.id}`

  // Load previous messages from localStorage
  const restoredMessages = useRef<StoredMessage[]>([])
  const initialized = useRef(false)

  if (!initialized.current) {
    restoredMessages.current = getSessionMessages(activeSessionId)
    ensureSessionMeta(activeSessionId)
    initialized.current = true
  }

  const runtime = useLocalRuntime(createAgentAdapter(agent, activeSessionId))

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] min-h-0">
      <div className="flex-[3] min-w-0">
        <AssistantRuntimeProvider runtime={runtime}>
          <AgentThread
            agent={agent}
            sessionId={activeSessionId}
            restoredMessages={restoredMessages.current}
          />
        </AssistantRuntimeProvider>
      </div>
      <div className="flex-[2] min-w-0 hidden lg:flex">
        <ActivityPanel agent={agent} />
      </div>
    </div>
  )
}
