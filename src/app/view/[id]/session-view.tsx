"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertCircleIcon,
  RefreshCwIcon,
  ClockIcon,
  CoinsIcon,
  LoaderIcon,
  WrenchIcon,
  ChevronUpIcon,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────

type MessageContent = {
  type: string
  text?: string
  name?: string
  id?: string
  arguments?: unknown
}

type GatewayMessage = {
  role: "user" | "assistant" | "toolCall" | "toolResult"
  content: MessageContent[]
  timestamp?: number
  model?: string
  usage?: {
    input?: number
    output?: number
    totalTokens?: number
    cost?: { total?: number }
  }
  toolName?: string
  toolCallId?: string
  isError?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────

function extractText(content: MessageContent[]): string {
  return content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("\n")
    .trim()
}

function formatTime(ts?: number): string {
  if (!ts) return ""
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function formatCost(cost?: number): string {
  if (!cost) return ""
  return `$${cost.toFixed(4)}`
}

// ─── Avatars ──────────────────────────────────────────────────

function UserAvatar() {
  return (
    <Avatar size="sm" className="mt-0.5 shrink-0 bg-amber-400/15">
      <AvatarFallback className="bg-amber-400/15 text-amber-400 text-[10px] font-bold">
        XO
      </AvatarFallback>
    </Avatar>
  )
}

function AssistantAvatar({ model }: { model?: string }) {
  const initials = model
    ? model.split("/").pop()?.slice(0, 2).toUpperCase() ?? "AI"
    : "AI"
  return (
    <Avatar size="sm" className="mt-0.5 shrink-0 bg-primary/15">
      <AvatarFallback className="bg-primary/15 text-primary text-[10px] font-bold">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

function ToolAvatar({ isError }: { isError?: boolean }) {
  return (
    <Avatar size="sm" className={cn("mt-0.5 shrink-0", isError ? "bg-red-400/15" : "bg-muted/60")}>
      <AvatarFallback
        className={cn(
          "text-[10px] font-bold",
          isError ? "bg-red-400/15 text-red-400" : "bg-muted/60 text-muted-foreground"
        )}
      >
        {isError ? "!" : "⚙"}
      </AvatarFallback>
    </Avatar>
  )
}

// ─── Tool call badge (inline in assistant bubble) ─────────────

function ToolCallBadge({ tc }: { tc: MessageContent }) {
  const name = String((tc as { name?: string }).name ?? "tool")
  const args = (tc as { arguments?: unknown }).arguments

  const prettyArgs = args
    ? (() => {
        try {
          return JSON.stringify(args, null, 2)
        } catch {
          return String(args)
        }
      })()
    : null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-default"
        >
          <WrenchIcon className="size-2.5 shrink-0" />
          {name}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-xs"
        >
          <div className="space-y-1">
            <div className="text-xs font-medium text-foreground">{name}</div>
            {prettyArgs && (
              <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                {prettyArgs}
              </pre>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ─── Message bubbles ──────────────────────────────────────────

function UserBubble({ msg }: { msg: GatewayMessage }) {
  const text = extractText(msg.content)
  if (!text) return null

  return (
    <div className="flex items-start gap-3 max-w-3xl">
      <UserAvatar />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-amber-400">You</span>
          {msg.timestamp && (
            <span className="text-[10px] text-muted-foreground/40">{formatTime(msg.timestamp)}</span>
          )}
        </div>
        <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{text}</div>
      </div>
    </div>
  )
}

function AssistantBubble({ msg }: { msg: GatewayMessage }) {
  const textParts = msg.content.filter((c) => c.type === "text" && c.text)
  const toolCalls = msg.content.filter((c) => c.type === "toolCall")

  if (textParts.length === 0 && toolCalls.length === 0) return null

  const modelShort = msg.model?.split("/").pop()

  return (
    <div className="flex items-start gap-3 max-w-3xl">
      <AssistantAvatar model={msg.model} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-semibold text-primary">Assistant</span>
          {modelShort && (
            <span className="text-[10px] text-muted-foreground/40 font-mono">{modelShort}</span>
          )}
          {msg.timestamp && (
            <span className="text-[10px] text-muted-foreground/40">{formatTime(msg.timestamp)}</span>
          )}
          {msg.usage?.totalTokens && (
            <span className="text-[10px] text-muted-foreground/40 ml-auto tabular-nums">
              {msg.usage.totalTokens.toLocaleString()} tok
            </span>
          )}
          {msg.usage?.cost?.total != null && msg.usage.cost.total > 0 && (
            <span className="text-[10px] text-muted-foreground/40 flex items-center gap-0.5">
              <CoinsIcon className="size-2.5" />
              {formatCost(msg.usage.cost.total)}
            </span>
          )}
        </div>

        {textParts.map((part, i) => (
          <div key={i} className="text-sm leading-relaxed text-foreground whitespace-pre-wrap mb-2 last:mb-0">
            {part.text}
          </div>
        ))}

        {toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {toolCalls.map((tc, i) => (
              <ToolCallBadge key={i} tc={tc} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ToolResultBubble({ msg }: { msg: GatewayMessage }) {
  const text = extractText(msg.content)
  const [expanded, setExpanded] = useState(false)

  if (!text) return null

  const PREVIEW_CHARS = 280
  const isLong = text.length > PREVIEW_CHARS

  return (
    <div className="flex items-start gap-3 max-w-3xl">
      <ToolAvatar isError={msg.isError} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn("text-[10px] font-medium font-mono", msg.isError ? "text-red-400" : "text-muted-foreground/60")}>
            {msg.toolName ?? "result"}
          </span>
          {msg.timestamp && (
            <span className="text-[10px] text-muted-foreground/40">{formatTime(msg.timestamp)}</span>
          )}
        </div>
        <pre className="text-[11px] leading-relaxed text-muted-foreground/70 font-mono bg-muted/30 rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap border border-border/30">
          {expanded ? text : text.slice(0, PREVIEW_CHARS)}
          {isLong && !expanded && "…"}
        </pre>
        {isLong && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 text-[10px] text-muted-foreground/50 hover:text-primary transition-colors flex items-center gap-1"
          >
            <ChevronUpIcon className={cn("size-3 transition-transform", !expanded && "rotate-180")} />
            {expanded ? "Collapse" : `Expand (${text.length.toLocaleString()} chars)`}
          </button>
        )}
      </div>
    </div>
  )
}

function MessageRow({ msg }: { msg: GatewayMessage }) {
  switch (msg.role) {
    case "user":       return <UserBubble msg={msg} />
    case "assistant":  return <AssistantBubble msg={msg} />
    case "toolResult": return <ToolResultBubble msg={msg} />
    default:           return null
  }
}

// ─── Pagination helpers ───────────────────────────────────────

const PAGE_SIZE = 40
const LOAD_MORE = 50

// ─── Main component ───────────────────────────────────────────

export function SessionView({ sessionId }: { sessionId: string }) {
  // All messages fetched from Gateway (initial load = 40, then +50 each scroll-up)
  const [allMessages, setAllMessages] = useState<GatewayMessage[]>([])
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  // Remember scroll position before loading more so we don't jump
  const prevScrollHeightRef = useRef(0)

  // Visible slice = last `visibleCount` messages
  const visible = allMessages.slice(Math.max(0, allMessages.length - visibleCount))
  const hasMore = visibleCount < allMessages.length

  // Load messages from Gateway
  const loadMessages = useCallback((key: string, limit: number) => {
    return fetch(
      `/api/openclaw/sessions/history?sessionKey=${encodeURIComponent(key)}&limit=${limit}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        const visible = (data.messages ?? []).filter((m: GatewayMessage) => {
          if (m.role === "assistant") {
            return (
              m.content.some((c) => c.type === "text" && c.text?.trim()) ||
              m.content.some((c) => c.type === "toolCall")
            )
          }
          if (m.role === "toolResult") return extractText(m.content).length > 0
          return true
        })
        return visible as GatewayMessage[]
      })
  }, [])

  // Initial load — fetch last 200 messages but only show 40
  useEffect(() => {
    fetch("/api/openclaw/sessions")
      .then((r) => r.json())
      .then((data) => {
        const session = data.sessions?.find(
          (s: { sessionId: string; key: string }) => s.sessionId === sessionId
        )
        if (!session) throw new Error(`Session ${sessionId} not found`)
        setSessionKey(session.key)
        return loadMessages(session.key, 200)
      })
      .then((msgs) => {
        setAllMessages(msgs)
        setVisibleCount(PAGE_SIZE)
        setError(null)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [sessionId, loadMessages])

  // Scroll to bottom after initial load
  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" })
    }
  }, [loading])

  // Restore scroll position after expanding visible window
  useEffect(() => {
    const el = scrollRef.current
    if (!el || prevScrollHeightRef.current === 0) return
    el.scrollTop = el.scrollHeight - prevScrollHeightRef.current
    prevScrollHeightRef.current = 0
  }, [visibleCount])

  // IntersectionObserver — load more when user scrolls to the top sentinel
  useEffect(() => {
    const sentinel = topSentinelRef.current
    const container = scrollRef.current
    if (!sentinel || !container || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          setLoadingMore(true)
          prevScrollHeightRef.current = container.scrollHeight
          setVisibleCount((c) => c + LOAD_MORE)
          setTimeout(() => setLoadingMore(false), 50)
        }
      },
      { root: container, threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore])

  // Stats
  const userTurns = allMessages.filter((m) => m.role === "user").length
  const lastCost = allMessages
    .filter((m) => m.role === "assistant")
    .reduce((sum, m) => sum + (m.usage?.cost?.total ?? 0), 0)
  const lastMsg = allMessages.at(-1)

  return (
    <div className="flex h-[calc(100vh-var(--header-height))] flex-col">
      {/* Stats bar */}
      <div className="border-b bg-background/80 backdrop-blur-sm px-4 py-2 flex items-center gap-3 text-[11px] text-muted-foreground/60 shrink-0">
        <span className="font-mono truncate max-w-[320px]" title={sessionKey ?? sessionId}>
          {sessionKey ?? sessionId}
        </span>
        <div className="ml-auto flex items-center gap-3">
          {userTurns > 0 && (
            <span className="flex items-center gap-1">
              <span>👤</span>
              {userTurns} turns
            </span>
          )}
          {lastCost > 0 && (
            <span className="flex items-center gap-1">
              <CoinsIcon className="size-3" />
              {formatCost(lastCost)}
            </span>
          )}
          {lastMsg?.timestamp && (
            <span className="flex items-center gap-1">
              <ClockIcon className="size-3" />
              {formatTime(lastMsg.timestamp)}
            </span>
          )}
        </div>
      </div>

      {/* Messages scroll area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {/* Loading skeleton */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground/50">
            <LoaderIcon className="size-4 animate-spin" />
            <span className="text-sm">Loading session…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center justify-center gap-2 py-20 text-red-400/70">
            <AlertCircleIcon className="size-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && allMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/40">
            <span className="text-3xl mb-2">💬</span>
            <span className="text-sm">No messages in this session</span>
          </div>
        )}

        {!loading && !error && allMessages.length > 0 && (
          <>
            {/* Top sentinel — triggers load-more when scrolled into view */}
            <div ref={topSentinelRef} className="h-1" />

            {/* Load-more indicator */}
            {hasMore && (
              <div className="flex items-center justify-center py-3">
                {loadingMore ? (
                  <LoaderIcon className="size-3.5 animate-spin text-muted-foreground/40" />
                ) : (
                  <span className="text-[10px] text-muted-foreground/30 select-none">
                    scroll up for older messages
                  </span>
                )}
              </div>
            )}

            {/* Message list */}
            <div className="space-y-5">
              {visible.map((msg, i) => (
                <MessageRow key={`${msg.role}-${msg.timestamp ?? i}`} msg={msg} />
              ))}
            </div>

            <div ref={bottomRef} className="h-4" />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t bg-background/80 backdrop-blur-sm px-4 py-2 flex items-center justify-between shrink-0">
        <span className="text-[11px] text-muted-foreground/40">
          Showing {visible.length} of {allMessages.length} messages
        </span>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          <RefreshCwIcon className="size-3" />
          Refresh
        </button>
      </div>
    </div>
  )
}
