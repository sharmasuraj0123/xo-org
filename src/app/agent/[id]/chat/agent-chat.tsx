// @ts-nocheck
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  ArrowUpIcon,
  PaperclipIcon,
  SquareIcon,
  CopyIcon,
  CheckIcon,
  LoaderIcon,
  FileTextIcon,
  FileCodeIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  ChevronRightIcon,
  DownloadIcon,
  UploadIcon,
  ArrowLeftIcon,
  WrenchIcon,
  AlertCircleIcon,
  CpuIcon,
  RefreshCwIcon,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarBadge } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { type Agent, type AgentRole } from "@/lib/mock-data"
import { useAgentChat, type ChatMessage, type ToolCall } from "@/hooks/use-agent-chat"
import type { FC } from "react"

// ─── Style maps ───────────────────────────────────────────────

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

const STATUS_LABEL: Record<Agent["status"], string> = {
  active: "Active",
  idle: "Idle",
  offline: "Offline",
}

// ─── Helpers ──────────────────────────────────────────────────

function formatTime(ts?: string): string {
  if (!ts) return ""
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch { return "" }
}

// ─── Tool call badge ──────────────────────────────────────────

const ToolCallBadge: FC<{ tc: ToolCall }> = ({ tc }) => {
  const prettyArgs = tc.input
    ? (() => { try { return JSON.stringify(tc.input, null, 2) } catch { return String(tc.input) } })()
    : null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-default">
          {tc.status === "running"
            ? <LoaderIcon className="size-2.5 shrink-0 animate-spin" />
            : <WrenchIcon className="size-2.5 shrink-0" />
          }
          {tc.tool}
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-xs">
          <div className="space-y-1">
            <div className="text-xs font-medium text-foreground">{tc.tool}</div>
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

const UserBubble: FC<{ msg: ChatMessage }> = ({ msg }) => (
  <div className="px-4 py-2">
    <div className="flex items-start gap-3 max-w-3xl">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-[11px] font-semibold text-amber-400">
        XO
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-amber-400">xo</span>
          {msg.ts && <span className="text-[10px] text-muted-foreground/40">{formatTime(msg.ts)}</span>}
        </div>
        <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{msg.text}</div>
      </div>
    </div>
  </div>
)

const AssistantBubble: FC<{ msg: ChatMessage; agent: Agent }> = ({ msg, agent }) => {
  const role = ROLE_STYLES[agent.role]
  const initials = agent.name.slice(0, 2).toUpperCase()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const hasContent = msg.text || (msg.toolCalls?.length ?? 0) > 0

  return (
    <div className="group px-4 py-2">
      <div className="flex items-start gap-3 max-w-3xl">
        <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold", role.bg, role.text)}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={cn("text-xs font-medium", role.text)}>{agent.name}</span>
            {msg.ts && <span className="text-[10px] text-muted-foreground/40">{formatTime(msg.ts)}</span>}
            {msg.usage?.outputTokens && (
              <span className="text-[10px] text-muted-foreground/40 tabular-nums ml-auto">
                {(msg.usage.inputTokens ?? 0) + msg.usage.outputTokens} tok
              </span>
            )}
          </div>

          {msg.text && (
            <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {msg.text}
              {msg.streaming && (
                <span className="inline-block w-0.5 h-4 bg-primary/70 ml-0.5 animate-pulse align-text-bottom" />
              )}
            </div>
          )}

          {(msg.toolCalls?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {msg.toolCalls!.map((tc) => <ToolCallBadge key={tc.id} tc={tc} />)}
            </div>
          )}

          {msg.text && !msg.streaming && (
            <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={handleCopy}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
              >
                {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const ThinkingBubble: FC<{ agent: Agent }> = ({ agent }) => {
  const role = ROLE_STYLES[agent.role]
  const initials = agent.name.slice(0, 2).toUpperCase()
  return (
    <div className="px-4 py-2">
      <div className="flex items-start gap-3 max-w-3xl">
        <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold", role.bg, role.text)}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <span className={cn("text-xs font-medium", role.text)}>{agent.name}</span>
          <div className="mt-1 flex items-center gap-1.5">
            <LoaderIcon className="size-3.5 animate-spin text-muted-foreground/50" />
            <span className="text-xs text-muted-foreground/50">thinking…</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────

const EmptyState: FC<{ agent: Agent; sessionKey: string | null; connected: boolean }> = ({ agent, sessionKey, connected }) => {
  const role = ROLE_STYLES[agent.role]
  const initials = agent.name.slice(0, 2).toUpperCase()
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <Avatar className={cn("size-14 mb-4", role.bg)}>
        <AvatarFallback className={cn("text-lg font-bold tracking-wide", role.bg, role.text)}>
          {initials}
        </AvatarFallback>
        <AvatarBadge className={STATUS_BADGE[agent.status]} />
      </Avatar>
      <h1 className="text-xl font-semibold text-foreground">{agent.name}</h1>
      <p className={cn("text-sm font-medium mt-0.5", role.text)}>{agent.role}</p>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
        {connected
          ? `Send a message to start a conversation with ${agent.name}.`
          : "Connecting to Gateway…"}
      </p>
      {sessionKey && (
        <p className="mt-1 text-[10px] text-muted-foreground/40 font-mono">{sessionKey}</p>
      )}
    </div>
  )
}

// ─── Composer ─────────────────────────────────────────────────

const AgentComposer: FC<{
  agentName: string
  onSend: (text: string) => void
  onAbort: () => void
  isRunning: boolean
  disabled?: boolean
}> = ({ agentName, onSend, onAbort, isRunning, disabled }) => {
  const [text, setText] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = text.trim().length > 0 && !isRunning && !disabled

  const handleSend = () => {
    if (!canSend) return
    onSend(text.trim())
    setText("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    e.target.style.height = "auto"
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-border bg-card p-1 shadow-sm">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "Connecting to Gateway…" : `Message ${agentName}…`}
        rows={1}
        disabled={disabled}
        autoFocus={!disabled}
        className="max-h-40 min-h-[2.5rem] w-full flex-shrink-0 resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
      />
      <div className="flex items-center justify-between px-2 pb-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <PaperclipIcon className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              type="button"
              onClick={onAbort}
              className="flex size-8 items-center justify-center rounded-lg bg-destructive text-white transition-colors hover:bg-destructive/90"
              title="Stop generation"
            >
              <SquareIcon className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowUpIcon className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Message list ─────────────────────────────────────────────

const MessageList: FC<{ messages: ChatMessage[]; agent: Agent; isRunning: boolean }> = ({ messages, agent, isRunning }) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevLenRef = useRef(0)

  useEffect(() => {
    if (messages.length !== prevLenRef.current || isRunning) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      prevLenRef.current = messages.length
    }
  }, [messages.length, isRunning])

  // Show thinking bubble only if running and last message is user (no streaming bubble yet)
  const lastMsg = messages.at(-1)
  const showThinking = isRunning && lastMsg?.role === "user"

  return (
    <div className="flex flex-col py-2">
      {messages.map((msg) =>
        msg.role === "user"
          ? <UserBubble key={msg.id} msg={msg} />
          : <AssistantBubble key={msg.id} msg={msg} agent={agent} />
      )}
      {showThinking && <ThinkingBubble agent={agent} />}
      <div ref={bottomRef} className="h-4" />
    </div>
  )
}

// ─── File explorer (unchanged) ────────────────────────────────

type FSEntry = { name: string; type: "folder" | "file"; size: string; modified: string; extension: string }

function getFileIcon(ext: string) {
  switch (ext) {
    case "md": case "txt": case "pdf": case "doc": case "docx": return FileTextIcon
    case "ts": case "tsx": case "js": case "jsx": case "py": case "json": case "yml": case "yaml": case "toml": return FileCodeIcon
    default: return FileIcon
  }
}

function useStorageEntries(dirPath: string) {
  const [entries, setEntries] = useState<FSEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [rootName, setRootName] = useState("workspace")

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/storage?path=${encodeURIComponent(dirPath)}`)
      if (res.ok) { const data = await res.json(); setEntries(data.entries); setRootName(data.root) }
    } catch {} finally { setLoading(false) }
  }, [dirPath])

  useEffect(() => { refresh() }, [refresh])
  return { entries, loading, rootName, refresh }
}

function FileExplorer() {
  const [pathSegments, setPathSegments] = useState<string[]>([])
  const dirPath = pathSegments.join("/")
  const { entries, loading, rootName, refresh } = useStorageEntries(dirPath)
  const folders = entries.filter((e) => e.type === "folder")
  const files = entries.filter((e) => e.type === "file")

  const handleUpload = () => {
    const input = document.createElement("input"); input.type = "file"; input.multiple = true
    input.onchange = async () => {
      if (!input.files) return
      for (const file of Array.from(input.files)) {
        const form = new FormData(); form.append("file", file); form.append("path", dirPath)
        await fetch("/api/storage", { method: "POST", body: form })
      }
      refresh()
    }
    input.click()
  }

  const download = (filePath: string) => {
    const a = document.createElement("a"); a.href = `/api/storage/file?path=${encodeURIComponent(filePath)}`
    a.download = filePath.split("/").pop() || "download"; document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 overflow-hidden">
          <button onClick={() => setPathSegments([])} className="shrink-0 hover:text-foreground transition-colors">{rootName}</button>
          {pathSegments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <ChevronRightIcon className="size-3 text-muted-foreground/40" />
              <button onClick={() => setPathSegments(pathSegments.slice(0, i + 1))} className={cn("hover:text-foreground transition-colors", i === pathSegments.length - 1 && "text-foreground font-medium")}>{seg}</button>
            </span>
          ))}
        </div>
        <button onClick={handleUpload} className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><UploadIcon className="size-3.5" /></button>
      </div>
      <div className="flex items-center gap-2 px-1 mb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">All Files</span>
        <Separator className="flex-1" />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6"><LoaderIcon className="size-4 text-muted-foreground/50 animate-spin" /></div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {pathSegments.length > 0 && (
            <button onClick={() => setPathSegments(pathSegments.slice(0, -1))} className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors">
              <ArrowLeftIcon className="size-3" /><span>Back</span>
            </button>
          )}
          {folders.map((f) => (
            <button key={f.name} onClick={() => setPathSegments([...pathSegments, f.name])} className="group flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50 rounded-md transition-colors text-left">
              <FolderIcon className="size-3.5 text-primary/60 shrink-0" />
              <span className="flex-1 truncate font-medium text-foreground">{f.name}</span>
            </button>
          ))}
          {files.map((f) => {
            const Icon = getFileIcon(f.extension)
            const fp = pathSegments.length > 0 ? `${pathSegments.join("/")}/${f.name}` : f.name
            return (
              <div key={f.name} className="group flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50 rounded-md transition-colors">
                <Icon className="size-3.5 text-muted-foreground/60 shrink-0" />
                <span className="flex-1 truncate text-foreground/80">{f.name}</span>
                <span className="text-[10px] text-muted-foreground/40 shrink-0">{f.size}</span>
                <button onClick={() => download(fp)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"><DownloadIcon className="size-3" /></button>
              </div>
            )
          })}
          {entries.length === 0 && <div className="text-center py-6 text-xs text-muted-foreground/50">Empty folder</div>}
        </div>
      )}
    </>
  )
}

// ─── Activity panel ───────────────────────────────────────────

function ActivityPanel({ agent, sessionKey, connected }: { agent: Agent; sessionKey: string | null; connected: boolean }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto border-l bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <CpuIcon className="size-4" />Session
          </h3>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
              <span className="text-muted-foreground/60">Status</span>
              <div className="flex items-center gap-1.5">
                <span className={cn("size-1.5 rounded-full", STATUS_BADGE[agent.status])} />
                <span className="font-medium text-foreground">{STATUS_LABEL[agent.status]}</span>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
              <span className="text-muted-foreground/60">Gateway</span>
              <div className="flex items-center gap-1.5">
                {connected
                  ? <><Wifi className="size-3 text-primary" /><span className="text-primary font-medium">Connected</span></>
                  : <><WifiOff className="size-3 text-amber-400" /><span className="text-amber-400 font-medium">Connecting…</span></>
                }
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
              <span className="text-muted-foreground/60">Session</span>
              <span className="font-mono text-[10px] text-foreground truncate max-w-[140px]">{sessionKey ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
              <span className="text-muted-foreground/60">Model</span>
              <span className="font-mono text-[10px] text-foreground">{agent.model}</span>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <FolderOpenIcon className="size-4" />Folder
          </h3>
          <FileExplorer />
        </div>
      </div>
    </div>
  )
}

// ─── Session resolver ─────────────────────────────────────────

function useAgentSessionKey(agent: Agent, overrideSessionId?: string) {
  const [sessionKey, setSessionKey] = useState<string | null>(null)

  useEffect(() => {
    // If override is a full session key (contains colons), use directly
    if (overrideSessionId?.includes(":")) {
      setSessionKey(overrideSessionId)
      return
    }

    fetch("/api/openclaw/sessions")
      .then((r) => r.json())
      .then((data) => {
        const sessions: Array<{ key: string; sessionId: string; origin?: { label?: string; from?: string } }> = data.sessions ?? []
        const match =
          sessions.find((s) => s.origin?.label === agent.id) ??
          sessions.find((s) => s.key.includes(agent.id)) ??
          sessions.find((s) => s.key === "agent:main:main") ??
          sessions[0]
        if (match) setSessionKey(match.key)
      })
      .catch(() => {})
  }, [agent.id, overrideSessionId])

  return sessionKey
}

// ─── Main export ──────────────────────────────────────────────

export function AgentChat({ agent, sessionId }: { agent: Agent; sessionId?: string }) {
  const sessionKey = useAgentSessionKey(agent, sessionId)
  const { messages, isRunning, connected, error, sendMessage, abortRun } = useAgentChat(sessionKey)

  return (
    <div className="h-[calc(100vh-var(--header-height))] min-h-0">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={62} minSize={35}>
          <div className="flex h-full flex-col bg-background">
            {/* Error bar */}
            {error && (
              <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive">
                <AlertCircleIcon className="size-3.5 shrink-0" />
                <span className="flex-1 truncate">{error}</span>
              </div>
            )}

            {/* Messages */}
            <div className="flex flex-1 flex-col overflow-y-scroll scroll-smooth min-h-0">
              {messages.length === 0 ? (
                <EmptyState agent={agent} sessionKey={sessionKey} connected={connected} />
              ) : (
                <MessageList messages={messages} agent={agent} isRunning={isRunning} />
              )}
            </div>

            {/* Composer */}
            <div className="shrink-0 bg-background px-4 pb-4 pt-2">
              <AgentComposer
                agentName={agent.name}
                onSend={sendMessage}
                onAbort={abortRun}
                isRunning={isRunning}
                disabled={!connected || !sessionKey}
              />
              {sessionKey && (
                <div className="mt-1.5 flex items-center justify-between px-1">
                  <span className="text-[10px] text-muted-foreground/30 font-mono truncate max-w-[80%]">{sessionKey}</span>
                  <div className={cn("flex items-center gap-1 text-[10px]", connected ? "text-primary/40" : "text-amber-400/50")}>
                    <span className={cn("size-1.5 rounded-full", connected ? "bg-primary/50" : "bg-amber-400/50 animate-pulse")} />
                    {connected ? "live" : "reconnecting"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={38} minSize={20}>
          <ActivityPanel agent={agent} sessionKey={sessionKey} connected={connected} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
