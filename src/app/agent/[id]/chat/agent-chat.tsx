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
  AlertCircleIcon,
  CpuIcon,
  RefreshCwIcon,
  WifiIcon,
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
import type { FC } from "react"

// ─── Types ────────────────────────────────────────────────────

type MsgContent = {
  type: string
  text?: string
  name?: string
  arguments?: unknown
}

type GatewayMsg = {
  role: "user" | "assistant" | "toolCall" | "toolResult"
  content: MsgContent[]
  timestamp?: number
  model?: string
  usage?: { input?: number; output?: number; totalTokens?: number; cost?: { total?: number } }
  toolName?: string
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

const STATUS_LABEL: Record<Agent["status"], string> = {
  active: "Active", idle: "Idle", offline: "Offline",
}

// ─── Helpers ──────────────────────────────────────────────────

function extractText(content: MsgContent[]): string {
  return content.filter((c) => c.type === "text" && c.text?.trim()).map((c) => c.text!).join("\n").trim()
}

function formatTime(ts?: number): string {
  if (!ts) return ""
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

// ─── Session resolver ─────────────────────────────────────────

function useSessionKey(agent: Agent, overrideId?: string) {
  const [sessionKey, setSessionKey] = useState<string | null>(null)

  useEffect(() => {
    if (overrideId?.includes(":")) { setSessionKey(overrideId); return }
    fetch("/api/openclaw/sessions")
      .then((r) => r.json())
      .then((data) => {
        const sessions = data.sessions ?? []
        const match =
          sessions.find((s) => s.origin?.label === agent.id) ??
          sessions.find((s) => s.key.includes(agent.id)) ??
          sessions.find((s) => s.key === "agent:main:main") ??
          sessions[0]
        if (match) setSessionKey(match.key)
      })
      .catch(() => {})
  }, [agent.id, overrideId])

  return sessionKey
}

// ─── Chat state hook (HTTP polling) ──────────────────────────

type ChatState = {
  messages: GatewayMsg[]
  sending: boolean
  pendingText: string | null
  error: string | null
  isWaiting: boolean
}

function useChat(sessionKey: string | null) {
  const [state, setState] = useState<ChatState>({
    messages: [], sending: false, pendingText: null, error: null, isWaiting: false,
  })
  const pollInterval = useRef<NodeJS.Timeout | null>(null)
  const msgCountRef = useRef(0)
  const activeRef = useRef(true)

  const fetchMessages = useCallback(async (silent = false) => {
    if (!sessionKey || !activeRef.current) return
    try {
      const res = await fetch(`/api/openclaw/sessions/history?sessionKey=${encodeURIComponent(sessionKey)}&limit=200`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const msgs: GatewayMsg[] = (data.messages ?? []).filter((m: GatewayMsg) => {
        if (m.role === "assistant") return m.content.some((c) => c.type === "text" && c.text?.trim()) || m.content.some((c) => c.type === "toolCall")
        if (m.role === "toolResult") return false
        return m.role === "user" || m.role === "assistant"
      })
      if (activeRef.current) {
        msgCountRef.current = msgs.length
        setState((prev) => ({ ...prev, messages: msgs, error: null }))
      }
    } catch (e) {
      if (!silent && activeRef.current) setState((prev) => ({ ...prev, error: e instanceof Error ? e.message : String(e) }))
    }
  }, [sessionKey])

  // Initial load + background poll every 3s
  useEffect(() => {
    if (!sessionKey) return
    activeRef.current = true
    fetchMessages()
    pollInterval.current = setInterval(() => fetchMessages(true), 3000)
    return () => {
      activeRef.current = false
      if (pollInterval.current) clearInterval(pollInterval.current)
    }
  }, [sessionKey, fetchMessages])

  const sendMessage = useCallback(async (text: string) => {
    if (!sessionKey || state.sending) return
    setState((prev) => ({ ...prev, sending: true, pendingText: text, error: null, isWaiting: true }))

    try {
      const res = await fetch("/api/openclaw/sessions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKey, message: text }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`)

      // Fast-poll until new message appears (up to 90s)
      const prevCount = msgCountRef.current
      await new Promise((r) => setTimeout(r, 1000))
      for (let i = 0; i < 45 && activeRef.current; i++) {
        await fetchMessages(true)
        if (msgCountRef.current > prevCount) break
        await new Promise((r) => setTimeout(r, 2000))
      }
    } catch (e) {
      setState((prev) => ({ ...prev, error: e instanceof Error ? e.message : String(e) }))
    } finally {
      if (activeRef.current) setState((prev) => ({ ...prev, sending: false, pendingText: null, isWaiting: false }))
    }
  }, [sessionKey, state.sending, fetchMessages])

  return { ...state, sendMessage, refetch: fetchMessages }
}

// ─── Message bubbles ──────────────────────────────────────────

const UserBubble: FC<{ msg: GatewayMsg }> = ({ msg }) => {
  const text = extractText(msg.content)
  if (!text) return null
  return (
    <div className="px-4 py-2">
      <div className="flex items-start gap-3 max-w-3xl">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-[11px] font-semibold text-amber-400">XO</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-amber-400">xo</span>
            {msg.timestamp && <span className="text-[10px] text-muted-foreground/40">{formatTime(msg.timestamp)}</span>}
          </div>
          <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{text}</div>
        </div>
      </div>
    </div>
  )
}

const AssistantBubble: FC<{ msg: GatewayMsg; agent: Agent }> = ({ msg, agent }) => {
  const role = ROLE_STYLES[agent.role]
  const initials = agent.name.slice(0, 2).toUpperCase()
  const textParts = msg.content.filter((c) => c.type === "text" && c.text?.trim())
  const toolCalls = msg.content.filter((c) => c.type === "toolCall")
  const [copied, setCopied] = useState(false)
  const fullText = textParts.map((c) => c.text ?? "").join("\n")

  if (!fullText && toolCalls.length === 0) return null

  return (
    <div className="group px-4 py-2">
      <div className="flex items-start gap-3 max-w-3xl">
        <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold", role.bg, role.text)}>{initials}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className={cn("text-xs font-medium", role.text)}>{agent.name}</span>
            {msg.model && <span className="text-[10px] text-muted-foreground/40 font-mono">{msg.model.split("/").pop()}</span>}
            {msg.timestamp && <span className="text-[10px] text-muted-foreground/40">{formatTime(msg.timestamp)}</span>}
            {msg.usage?.totalTokens && <span className="text-[10px] text-muted-foreground/40 tabular-nums ml-auto">{msg.usage.totalTokens.toLocaleString()} tok</span>}
          </div>
          {fullText && <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{fullText}</div>}
          {toolCalls.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {toolCalls.map((tc, i) => (
                <TooltipProvider key={i}>
                  <Tooltip>
                    <TooltipTrigger className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-default">
                      <span className="size-2.5">⚙</span>{String(tc.name ?? "tool")}
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-xs">
                      <pre className="text-[10px] whitespace-pre-wrap font-mono max-h-40 overflow-y-auto">
                        {tc.arguments ? JSON.stringify(tc.arguments, null, 2) : "(no args)"}
                      </pre>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          )}
          {fullText && (
            <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button onClick={() => { navigator.clipboard.writeText(fullText); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors">
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
        <div className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold", role.bg, role.text)}>{initials}</div>
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

// ─── Message list ─────────────────────────────────────────────

const MessageList: FC<{ messages: GatewayMsg[]; agent: Agent; pendingText: string | null; isWaiting: boolean }> = ({ messages, agent, pendingText, isWaiting }) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevLen = useRef(0)

  useEffect(() => {
    if (messages.length !== prevLen.current || isWaiting) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      prevLen.current = messages.length
    }
  }, [messages.length, isWaiting])

  const lastMsg = messages.at(-1)
  const showThinking = isWaiting && lastMsg?.role === "user"

  return (
    <div className="flex flex-col py-2">
      {messages.map((msg, i) =>
        msg.role === "user"
          ? <UserBubble key={`u-${msg.timestamp ?? i}`} msg={msg} />
          : <AssistantBubble key={`a-${msg.timestamp ?? i}`} msg={msg} agent={agent} />
      )}
      {pendingText && (
        <div className="px-4 py-2 opacity-60">
          <div className="flex items-start gap-3 max-w-3xl">
            <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-[11px] font-semibold text-amber-400">XO</div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-amber-400">xo</span>
              <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap mt-0.5">{pendingText}</div>
            </div>
          </div>
        </div>
      )}
      {showThinking && <ThinkingBubble agent={agent} />}
      <div ref={bottomRef} className="h-4" />
    </div>
  )
}

// ─── Composer ─────────────────────────────────────────────────

const Composer: FC<{ agentName: string; onSend: (t: string) => void; sending: boolean; disabled?: boolean }> = ({
  agentName, onSend, sending, disabled,
}) => {
  const [text, setText] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)
  const canSend = text.trim().length > 0 && !sending && !disabled

  const handleSend = () => {
    if (!canSend) return
    onSend(text.trim())
    setText("")
    if (ref.current) ref.current.style.height = "auto"
  }

  return (
    <div suppressHydrationWarning className="mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-border bg-card p-1 shadow-sm">
      <textarea
        suppressHydrationWarning
        ref={ref}
        value={text}
        onChange={(e) => { setText(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px` }}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
        placeholder={disabled ? "Loading session…" : `Message ${agentName}…`}
        rows={1}
        disabled={disabled || sending}
        autoFocus={!disabled}
        className="max-h-40 min-h-[2.5rem] w-full flex-shrink-0 resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
      />
      <div className="flex items-center justify-between px-2 pb-1">
        <button suppressHydrationWarning type="button" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <PaperclipIcon className="size-4" />
        </button>
        {sending ? (
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/30">
            <LoaderIcon className="size-3.5 animate-spin text-primary" />
          </div>
        ) : (
          <button suppressHydrationWarning type="button" onClick={handleSend} disabled={!canSend} className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed">
            <ArrowUpIcon className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── File explorer ────────────────────────────────────────────

type FSEntry = { name: string; type: "folder" | "file"; size: string; modified: string; extension: string }

function getFileIcon(ext: string) {
  if (["md","txt","pdf","doc","docx"].includes(ext)) return FileTextIcon
  if (["ts","tsx","js","jsx","py","json","yml","yaml","toml"].includes(ext)) return FileCodeIcon
  return FileIcon
}

function FileExplorer() {
  const [segs, setSegs] = useState<string[]>([])
  const [entries, setEntries] = useState<FSEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [root, setRoot] = useState("workspace")
  const dirPath = segs.join("/")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/storage?path=${encodeURIComponent(dirPath)}`)
      if (res.ok) { const d = await res.json(); setEntries(d.entries); setRoot(d.root) }
    } catch {} finally { setLoading(false) }
  }, [dirPath])

  useEffect(() => { load() }, [load])

  const dl = (fp: string) => { const a = document.createElement("a"); a.href = `/api/storage/file?path=${encodeURIComponent(fp)}`; a.download = fp.split("/").pop()!; document.body.appendChild(a); a.click(); document.body.removeChild(a) }

  const upload = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.multiple = true
    inp.onchange = async () => { if (!inp.files) return; for (const f of Array.from(inp.files)) { const fm = new FormData(); fm.append("file", f); fm.append("path", dirPath); await fetch("/api/storage", { method: "POST", body: fm }) }; load() }
    inp.click()
  }

  const folders = entries.filter((e) => e.type === "folder")
  const files = entries.filter((e) => e.type === "file")

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 overflow-hidden">
          <button onClick={() => setSegs([])} className="shrink-0 hover:text-foreground transition-colors">{root}</button>
          {segs.map((s, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <ChevronRightIcon className="size-3 text-muted-foreground/40" />
              <button onClick={() => setSegs(segs.slice(0, i + 1))} className={cn("hover:text-foreground transition-colors", i === segs.length - 1 && "text-foreground font-medium")}>{s}</button>
            </span>
          ))}
        </div>
        <button onClick={upload} className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><UploadIcon className="size-3.5" /></button>
      </div>
      <div className="flex items-center gap-2 px-1 mb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">All Files</span>
        <Separator className="flex-1" />
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6"><LoaderIcon className="size-4 text-muted-foreground/50 animate-spin" /></div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {segs.length > 0 && <button onClick={() => setSegs(segs.slice(0, -1))} className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"><ArrowLeftIcon className="size-3" /><span>Back</span></button>}
          {folders.map((f) => <button key={f.name} onClick={() => setSegs([...segs, f.name])} className="group flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50 rounded-md transition-colors text-left"><FolderIcon className="size-3.5 text-primary/60 shrink-0" /><span className="flex-1 truncate font-medium text-foreground">{f.name}</span></button>)}
          {files.map((f) => {
            const Icon = getFileIcon(f.extension)
            const fp = segs.length > 0 ? `${segs.join("/")}/${f.name}` : f.name
            return (
              <div key={f.name} className="group flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50 rounded-md transition-colors">
                <Icon className="size-3.5 text-muted-foreground/60 shrink-0" />
                <span className="flex-1 truncate text-foreground/80">{f.name}</span>
                <span className="text-[10px] text-muted-foreground/40 shrink-0">{f.size}</span>
                <button onClick={() => dl(fp)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"><DownloadIcon className="size-3" /></button>
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

const ActivityPanel: FC<{ agent: Agent; sessionKey: string | null }> = ({ agent, sessionKey }) => (
  <div className="flex h-full flex-col overflow-y-auto border-l bg-background">
    <div className="flex-1 overflow-y-auto p-4 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><CpuIcon className="size-4" />Session</h3>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
            <span className="text-muted-foreground/60">Status</span>
            <div className="flex items-center gap-1.5"><span className={cn("size-1.5 rounded-full", STATUS_BADGE[agent.status])} /><span className="font-medium text-foreground">{STATUS_LABEL[agent.status]}</span></div>
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
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3"><FolderOpenIcon className="size-4" />Folder</h3>
        <FileExplorer />
      </div>
    </div>
  </div>
)

// ─── Main ─────────────────────────────────────────────────────

export function AgentChat({ agent, sessionId }: { agent: Agent; sessionId?: string }) {
  const sessionKey = useSessionKey(agent, sessionId)
  const { messages, sending, pendingText, error, isWaiting, sendMessage, refetch } = useChat(sessionKey)

  const role = ROLE_STYLES[agent.role]
  const initials = agent.name.slice(0, 2).toUpperCase()

  return (
    <div className="h-[calc(100vh-var(--header-height))] min-h-0">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={62} minSize={35}>
          <div className="flex h-full flex-col bg-background">

            {/* Error bar */}
            {error && (
              <div className="flex items-center gap-2 border-b border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive shrink-0">
                <AlertCircleIcon className="size-3.5 shrink-0" />
                <span className="flex-1 truncate">{error}</span>
              </div>
            )}

            {/* Messages */}
            <div className="flex flex-1 flex-col overflow-y-scroll scroll-smooth min-h-0">
              {messages.length === 0 && !pendingText ? (
                <div className="flex flex-1 flex-col items-center justify-center px-4">
                  <Avatar className={cn("size-14 mb-4", role.bg)}>
                    <AvatarFallback className={cn("text-lg font-bold tracking-wide", role.bg, role.text)}>{initials}</AvatarFallback>
                    <AvatarBadge className={STATUS_BADGE[agent.status]} />
                  </Avatar>
                  <h1 className="text-xl font-semibold text-foreground">{agent.name}</h1>
                  <p className={cn("text-sm font-medium mt-0.5", role.text)}>{agent.role}</p>
                  <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                    {sessionKey ? `Send a message to start a conversation with ${agent.name}.` : "Loading session…"}
                  </p>
                  {sessionKey && <p className="mt-1 text-[10px] text-muted-foreground/40 font-mono">{sessionKey}</p>}
                </div>
              ) : (
                <MessageList messages={messages} agent={agent} pendingText={pendingText} isWaiting={isWaiting} />
              )}
            </div>

            {/* Composer */}
            <div className="shrink-0 bg-background px-4 pb-4 pt-2">
              <Composer agentName={agent.name} onSend={sendMessage} sending={sending} disabled={!sessionKey} />
              {sessionKey && (
                <div className="mt-1.5 flex items-center justify-between px-1">
                  <span className="text-[10px] text-muted-foreground/30 font-mono truncate max-w-[80%]">{sessionKey}</span>
                  <button onClick={() => refetch()} className="text-[10px] text-muted-foreground/30 hover:text-muted-foreground transition-colors flex items-center gap-1">
                    <RefreshCwIcon className="size-2.5" />refresh
                  </button>
                </div>
              )}
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={38} minSize={20}>
          <ActivityPanel agent={agent} sessionKey={sessionKey} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
