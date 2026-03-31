// @ts-nocheck
"use client"

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
} from "react"
import {
  ArrowUpIcon,
  PaperclipIcon,
  SquareIcon,
  CopyIcon,
  CheckIcon,
  CpuIcon,
  ActivityIcon,
  CheckCircle2Icon,
  CircleIcon,
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
  RefreshCwIcon,
  AlertCircleIcon,
  WrenchIcon,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarBadge } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { cn } from "@/lib/utils"
import { type Agent, type AgentRole } from "@/lib/mock-data"
import type { FC } from "react"

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

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {})
}

// ─── Gateway hooks ────────────────────────────────────────────

/** Resolves an agent's sessionKey from the live sessions list */
function useAgentSession(agent: Agent) {
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const resolve = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/openclaw/sessions")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // Match by agent id in the session origin or session key
      const sessions: Array<{ key: string; sessionId: string; origin?: { label?: string; from?: string } }> =
        data.sessions ?? []

      // Try to find a session matching this agent
      let match =
        sessions.find((s) => s.origin?.label === agent.id) ??
        sessions.find((s) => s.key.includes(agent.id)) ??
        sessions.find((s) => s.origin?.from?.includes(agent.id))

      // Fallback: use the main session
      if (!match) {
        match = sessions.find((s) => s.key === "agent:main:main") ?? sessions[0]
      }

      if (match) {
        setSessionKey(match.key)
      } else {
        setError("No active sessions found")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [agent.id])

  useEffect(() => { resolve() }, [resolve])

  return { sessionKey, error, loading, refetch: resolve }
}

/** Fetches and polls message history for a session */
function useSessionMessages(sessionKey: string | null, pollMs = 3000) {
  const [messages, setMessages] = useState<GatewayMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const latestCountRef = useRef(0)

  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!sessionKey) return
      if (!silent) setLoading(true)
      try {
        const res = await fetch(
          `/api/openclaw/sessions/history?sessionKey=${encodeURIComponent(sessionKey)}&limit=200`
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)

        const filtered: GatewayMessage[] = (data.messages ?? []).filter(
          (m: GatewayMessage) => {
            if (m.role === "assistant") {
              return (
                m.content.some((c) => c.type === "text" && c.text?.trim()) ||
                m.content.some((c) => c.type === "toolCall")
              )
            }
            if (m.role === "toolResult") return extractText(m.content).length > 0
            return true
          }
        )
        setMessages(filtered)
        latestCountRef.current = filtered.length
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [sessionKey]
  )

  // Initial load
  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Poll for new messages
  useEffect(() => {
    if (!sessionKey) return
    intervalRef.current = setInterval(() => fetchMessages(true), pollMs)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [sessionKey, pollMs, fetchMessages])

  return { messages, loading, error, refetch: fetchMessages }
}

// ─── Message bubbles ──────────────────────────────────────────

function ToolCallBadge({ tc }: { tc: MessageContent }) {
  const name = String(tc.name ?? "tool")
  const args = tc.arguments
  const prettyArgs = args
    ? (() => { try { return JSON.stringify(args, null, 2) } catch { return String(args) } })()
    : null

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-default">
          <WrenchIcon className="size-2.5 shrink-0" />
          {name}
        </TooltipTrigger>
        <TooltipContent side="top" align="start" className="max-w-xs">
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

const UserBubble: FC<{ msg: GatewayMessage }> = ({ msg }) => {
  const text = extractText(msg.content)
  if (!text) return null
  return (
    <div className="px-4 py-2">
      <div className="flex items-start gap-3 max-w-3xl">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-[11px] font-semibold text-amber-400">
          XO
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-amber-400">xo</span>
            {msg.timestamp && (
              <span className="text-[10px] text-muted-foreground/40">{formatTime(msg.timestamp)}</span>
            )}
          </div>
          <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{text}</div>
        </div>
      </div>
    </div>
  )
}

const AssistantBubble: FC<{ msg: GatewayMessage; agent: Agent }> = ({ msg, agent }) => {
  const role = ROLE_STYLES[agent.role]
  const initials = agent.name.slice(0, 2).toUpperCase()
  const textParts = msg.content.filter((c) => c.type === "text" && c.text?.trim())
  const toolCalls = msg.content.filter((c) => c.type === "toolCall")
  const [copied, setCopied] = useState(false)

  if (textParts.length === 0 && toolCalls.length === 0) return null

  const fullText = textParts.map((c) => c.text ?? "").join("\n")

  const handleCopy = () => {
    copyToClipboard(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="group px-4 py-2">
      <div className="flex items-start gap-3 max-w-3xl">
        <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold", role.bg, role.text)}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={cn("text-xs font-medium", role.text)}>{agent.name}</span>
            {msg.model && (
              <span className="text-[10px] text-muted-foreground/40 font-mono">
                {msg.model.split("/").pop()}
              </span>
            )}
            {msg.timestamp && (
              <span className="text-[10px] text-muted-foreground/40">{formatTime(msg.timestamp)}</span>
            )}
            {msg.usage?.totalTokens && (
              <span className="text-[10px] text-muted-foreground/40 tabular-nums ml-auto">
                {msg.usage.totalTokens.toLocaleString()} tok
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
              {toolCalls.map((tc, i) => <ToolCallBadge key={i} tc={tc} />)}
            </div>
          )}

          {fullText && (
            <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={handleCopy}
                className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                title="Copy"
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

// ─── Optimistic user message (while agent is thinking) ────────

const PendingBubble: FC<{ text: string }> = ({ text }) => (
  <div className="px-4 py-2 opacity-60">
    <div className="flex items-start gap-3 max-w-3xl">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-[11px] font-semibold text-amber-400">
        XO
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-xs font-medium text-amber-400">xo</span>
        <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap mt-0.5">{text}</div>
      </div>
    </div>
  </div>
)

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

// ─── Composer ─────────────────────────────────────────────────

const AgentComposer: FC<{
  agentName: string
  onSend: (text: string) => void
  sending: boolean
  disabled?: boolean
}> = ({ agentName, onSend, sending, disabled }) => {
  const [text, setText] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend = text.trim().length > 0 && !sending && !disabled

  const handleSend = () => {
    if (!canSend) return
    onSend(text.trim())
    setText("")
    setAttachedFiles([])
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    // Auto-resize
    e.target.style.height = "auto"
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
  }

  const handleAttachClick = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.multiple = true
    input.onchange = () => {
      if (input.files) setAttachedFiles((prev) => [...prev, ...Array.from(input.files!)])
    }
    input.click()
  }

  const removeAttachment = (i: number) =>
    setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-border bg-card p-1 shadow-sm">
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2">
          {attachedFiles.map((file, i) => (
            <div key={`${file.name}-${i}`} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2 py-1 text-xs">
              <PaperclipIcon className="size-3 text-muted-foreground" />
              <span className="max-w-[120px] truncate text-foreground">{file.name}</span>
              <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-foreground transition-colors">
                <span className="text-[10px]">×</span>
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? "Connect a session to chat…" : `Message ${agentName}…`}
        rows={1}
        disabled={disabled || sending}
        autoFocus={!disabled}
        className="max-h-40 min-h-[2.5rem] w-full flex-shrink-0 resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
      />

      <div className="flex items-center justify-between px-2 pb-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleAttachClick}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <PaperclipIcon className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {sending ? (
            <div className="flex size-8 items-center justify-center rounded-lg bg-destructive/80 text-white">
              <LoaderIcon className="size-3.5 animate-spin" />
            </div>
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

const MessageList: FC<{
  messages: GatewayMessage[]
  agent: Agent
  pendingText: string | null
  sending: boolean
}> = ({ messages, agent, pendingText, sending }) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length !== prevLengthRef.current || sending) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      prevLengthRef.current = messages.length
    }
  }, [messages.length, sending])

  return (
    <div className="flex flex-col py-2">
      {messages.map((msg, i) => {
        switch (msg.role) {
          case "user":
            return <UserBubble key={`${msg.role}-${msg.timestamp ?? i}`} msg={msg} />
          case "assistant":
            return <AssistantBubble key={`${msg.role}-${msg.timestamp ?? i}`} msg={msg} agent={agent} />
          default:
            return null
        }
      })}

      {/* Optimistic: user message sent, waiting for agent reply */}
      {pendingText && <PendingBubble text={pendingText} />}
      {sending && <ThinkingBubble agent={agent} />}

      <div ref={bottomRef} className="h-4" />
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────

const EmptyState: FC<{ agent: Agent; sessionKey: string | null }> = ({ agent, sessionKey }) => {
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
        Send a message to start a conversation with {agent.name}.
      </p>
      {sessionKey && (
        <p className="mt-1 text-[10px] text-muted-foreground/40 font-mono">
          session: {sessionKey}
        </p>
      )}
    </div>
  )
}

// ─── Activity panel (unchanged visual, removed mock data) ─────

const STATUS_LABEL: Record<Agent["status"], string> = {
  active: "Active",
  idle: "Idle",
  offline: "Offline",
}

type FSEntry = {
  name: string
  type: "folder" | "file"
  size: string
  modified: string
  extension: string
}

function getFileIcon(ext: string) {
  switch (ext) {
    case "md": case "txt": case "pdf": case "doc": case "docx":
      return FileTextIcon
    case "ts": case "tsx": case "js": case "jsx": case "py": case "json": case "yml": case "yaml": case "toml": case "env":
      return FileCodeIcon
    default:
      return FileIcon
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
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries)
        setRootName(data.root)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [dirPath])

  useEffect(() => { refresh() }, [refresh])

  return { entries, loading, rootName, refresh }
}

function downloadFile(filePath: string) {
  const url = `/api/storage/file?path=${encodeURIComponent(filePath)}`
  const a = document.createElement("a")
  a.href = url
  a.download = filePath.split("/").pop() || "download"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function FileExplorer() {
  const [pathSegments, setPathSegments] = useState<string[]>([])
  const dirPath = pathSegments.join("/")
  const { entries, loading, rootName, refresh } = useStorageEntries(dirPath)

  const folders = entries.filter((e) => e.type === "folder")
  const files = entries.filter((e) => e.type === "file")

  const handleUploadClick = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.multiple = true
    input.onchange = async () => {
      if (!input.files) return
      for (const file of Array.from(input.files)) {
        const form = new FormData()
        form.append("file", file)
        form.append("path", dirPath)
        await fetch("/api/storage", { method: "POST", body: form })
      }
      refresh()
    }
    input.click()
  }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 overflow-hidden">
          <button onClick={() => setPathSegments([])} className="shrink-0 hover:text-foreground transition-colors">
            {rootName}
          </button>
          {pathSegments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <ChevronRightIcon className="size-3 text-muted-foreground/40" />
              <button
                onClick={() => setPathSegments(pathSegments.slice(0, i + 1))}
                className={cn("hover:text-foreground transition-colors", i === pathSegments.length - 1 && "text-foreground font-medium")}
              >
                {seg}
              </button>
            </span>
          ))}
        </div>
        <button onClick={handleUploadClick} className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Upload file">
          <UploadIcon className="size-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 px-1 mb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">All Files</span>
        <Separator className="flex-1" />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <LoaderIcon className="size-4 text-muted-foreground/50 animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="flex flex-col gap-0.5">
          {pathSegments.length > 0 && (
            <button
              onClick={() => setPathSegments(pathSegments.slice(0, -1))}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
            >
              <ArrowLeftIcon className="size-3" />
              <span>Back</span>
            </button>
          )}

          {folders.map((folder) => (
            <button
              key={folder.name}
              onClick={() => setPathSegments([...pathSegments, folder.name])}
              className="group flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50 rounded-md transition-colors text-left"
            >
              <FolderIcon className="size-3.5 text-primary/60 shrink-0" />
              <span className="flex-1 truncate font-medium text-foreground">{folder.name}</span>
            </button>
          ))}

          {files.map((file) => {
            const Icon = getFileIcon(file.extension)
            const filePath = pathSegments.length > 0 ? `${pathSegments.join("/")}/${file.name}` : file.name
            return (
              <div key={file.name} className="group flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50 rounded-md transition-colors">
                <Icon className="size-3.5 text-muted-foreground/60 shrink-0" />
                <span className="flex-1 truncate text-foreground/80">{file.name}</span>
                <span className="text-[10px] text-muted-foreground/40 shrink-0">{file.size}</span>
                <button
                  onClick={() => downloadFile(filePath)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
                  title={`Download ${file.name}`}
                >
                  <DownloadIcon className="size-3" />
                </button>
              </div>
            )
          })}

          {entries.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground/50">Empty folder</div>
          )}
        </div>
      )}
    </>
  )
}

function ActivityPanel({ agent, sessionKey }: { agent: Agent; sessionKey: string | null }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto border-l bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Session info */}
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <CpuIcon className="size-4" />
            Session
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
              <span className="text-muted-foreground/60">Session key</span>
              <span className="font-mono text-[10px] text-foreground truncate max-w-[140px]">
                {sessionKey ?? "—"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
              <span className="text-muted-foreground/60">Model</span>
              <span className="font-mono text-[10px] text-foreground">{agent.model}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Workspace files */}
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <FolderOpenIcon className="size-4" />
            Folder
          </h3>
          <FileExplorer />
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────

export function AgentChat({ agent, sessionId }: { agent: Agent; sessionId?: string }) {
  const { sessionKey, error: sessionError, loading: sessionLoading } = useAgentSession(agent)
  const activeSessionKey = sessionId
    ? // If caller passes an explicit sessionId, try to use it as a key directly
      sessionId.includes(":") ? sessionId : sessionKey
    : sessionKey

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    refetch,
  } = useSessionMessages(activeSessionKey)

  const [pendingText, setPendingText] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const handleSend = async (text: string) => {
    if (!activeSessionKey) return
    setSendError(null)
    setPendingText(text)
    setSending(true)

    try {
      const res = await fetch("/api/openclaw/sessions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey: activeSessionKey, message: text }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      // Give the agent a moment to respond, then start polling aggressively
      await new Promise((r) => setTimeout(r, 800))
      // Poll a few extra times quickly to catch the reply
      for (let i = 0; i < 8; i++) {
        await refetch(true)
        await new Promise((r) => setTimeout(r, 1500))
      }
    } catch (e) {
      setSendError(e instanceof Error ? e.message : String(e))
    } finally {
      setPendingText(null)
      setSending(false)
    }
  }

  const isLoading = sessionLoading || messagesLoading
  const error = sessionError || messagesError || sendError

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
                <button onClick={() => setSendError(null)} className="shrink-0 opacity-60 hover:opacity-100">×</button>
              </div>
            )}

            {/* Messages area */}
            <div className="flex flex-1 flex-col overflow-y-scroll scroll-smooth min-h-0">
              {isLoading && messages.length === 0 ? (
                <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground/50">
                  <LoaderIcon className="size-4 animate-spin" />
                  <span className="text-sm">Loading session…</span>
                </div>
              ) : messages.length === 0 && !pendingText ? (
                <EmptyState agent={agent} sessionKey={activeSessionKey} />
              ) : (
                <MessageList
                  messages={messages}
                  agent={agent}
                  pendingText={pendingText}
                  sending={sending}
                />
              )}
            </div>

            {/* Composer */}
            <div className="shrink-0 bg-background px-4 pb-4 pt-2">
              <AgentComposer
                agentName={agent.name}
                onSend={handleSend}
                sending={sending}
                disabled={!activeSessionKey || sessionLoading}
              />
              {activeSessionKey && (
                <div className="mt-1.5 flex items-center justify-between px-1">
                  <span className="text-[10px] text-muted-foreground/30 font-mono truncate max-w-[80%]">
                    {activeSessionKey}
                  </span>
                  <button
                    onClick={() => refetch()}
                    className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground transition-colors flex items-center gap-1"
                  >
                    <RefreshCwIcon className="size-2.5" />
                    refresh
                  </button>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={38} minSize={20}>
          <ActivityPanel agent={agent} sessionKey={activeSessionKey} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
