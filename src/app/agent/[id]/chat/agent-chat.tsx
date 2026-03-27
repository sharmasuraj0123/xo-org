// @ts-nocheck
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
  BookOpenIcon,
  DownloadIcon,
  UploadIcon,
  ArrowLeftIcon,
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
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable"
import { cn } from "@/lib/utils"
import { type Agent, type AgentRole } from "@/lib/mock-data"
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

const AgentComposer: FC<{ agentName: string }> = ({ agentName }) => {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])

  const handleAttachClick = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.multiple = true
    input.onchange = () => {
      if (input.files) {
        setAttachedFiles((prev) => [...prev, ...Array.from(input.files!)])
      }
    }
    input.click()
  }

  const removeAttachment = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUploadAttachments = async () => {
    // Upload attached files to workspace
    for (const file of attachedFiles) {
      const form = new FormData()
      form.append("file", file)
      form.append("path", "")
      await fetch("/api/storage", { method: "POST", body: form })
    }
    setAttachedFiles([])
  }

  return (
    <ComposerPrimitive.Root
      className="mx-auto flex w-full max-w-3xl flex-col rounded-2xl border border-border bg-card p-1 shadow-sm"
      onSubmit={() => { if (attachedFiles.length > 0) handleUploadAttachments() }}
    >
      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2">
          {attachedFiles.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2 py-1 text-xs"
            >
              <PaperclipIcon className="size-3 text-muted-foreground" />
              <span className="max-w-[120px] truncate text-foreground">{file.name}</span>
              <button
                onClick={() => removeAttachment(i)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="text-[10px]">×</span>
              </button>
            </div>
          ))}
        </div>
      )}

      <ComposerPrimitive.Input
        placeholder={`Message ${agentName}...`}
        className="max-h-40 min-h-[2.5rem] w-full flex-shrink-0 resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
        rows={1}
        autoFocus
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
}

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

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mt-auto flex-shrink-0 bg-background px-4 pb-4 pt-2">
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

// Mock progress steps for UI
const PROGRESS_STEPS = [
  { label: "Understanding request", status: "completed" as const },
  { label: "Searching knowledge base", status: "completed" as const },
  { label: "Analyzing documents", status: "active" as const },
  { label: "Generating response", status: "pending" as const },
]

// Mock documents produced during thread
const THREAD_DOCUMENTS = [
  { name: "Q2 Competitor Analysis.pdf", type: "pdf", createdAt: "2m ago", size: "2.4 MB" },
  { name: "Market Research Summary.md", type: "md", createdAt: "5m ago", size: "48 KB" },
  { name: "Data Sources.csv", type: "csv", createdAt: "8m ago", size: "1.1 MB" },
  { name: "Competitor SWOT Matrix.xlsx", type: "xlsx", createdAt: "12m ago", size: "340 KB" },
  { name: "Executive Brief.pdf", type: "pdf", createdAt: "18m ago", size: "890 KB" },
]


// --- Real file explorer ---

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

function FileExplorer({ onFileUpload }: { onFileUpload?: (file: File, path: string) => void }) {
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
        if (onFileUpload) onFileUpload(file, dirPath)
      }
      refresh()
    }
    input.click()
  }

  return (
    <>
      {/* Relative path from project root */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0 overflow-hidden">
          <button
            onClick={() => setPathSegments([])}
            className="shrink-0 hover:text-foreground transition-colors"
          >
            {rootName}
          </button>
          {pathSegments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <ChevronRightIcon className="size-3 text-muted-foreground/40" />
              <button
                onClick={() => setPathSegments(pathSegments.slice(0, i + 1))}
                className={cn(
                  "hover:text-foreground transition-colors",
                  i === pathSegments.length - 1 && "text-foreground font-medium"
                )}
              >
                {seg}
              </button>
            </span>
          ))}
        </div>
        <button
          onClick={handleUploadClick}
          className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Upload file"
        >
          <UploadIcon className="size-3.5" />
        </button>
      </div>

      {/* All Files label */}
      <div className="flex items-center gap-2 px-1 mb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">All Files</span>
        <Separator className="flex-1" />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-6">
          <LoaderIcon className="size-4 text-muted-foreground/50 animate-spin" />
        </div>
      )}

      {/* File list */}
      {!loading && (
        <div className="flex flex-col gap-0.5">
          {/* Back button */}
          {pathSegments.length > 0 && (
            <button
              onClick={() => setPathSegments(pathSegments.slice(0, -1))}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
            >
              <ArrowLeftIcon className="size-3" />
              <span>Back</span>
            </button>
          )}

          {/* Folders */}
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

          {/* Files */}
          {files.map((file) => {
            const Icon = getFileIcon(file.extension)
            const filePath = pathSegments.length > 0
              ? `${pathSegments.join("/")}/${file.name}`
              : file.name
            return (
              <div
                key={file.name}
                className="group flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50 rounded-md transition-colors"
              >
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

          {/* Empty */}
          {entries.length === 0 && (
            <div className="text-center py-6 text-xs text-muted-foreground/50">
              Empty folder
            </div>
          )}
        </div>
      )}
    </>
  )
}

function ActivityPanel({ agent }: { agent: Agent }) {
  const completedSteps = PROGRESS_STEPS.filter((s) => s.status === "completed").length
  const totalSteps = PROGRESS_STEPS.length
  const progressPercent = Math.round((completedSteps / totalSteps) * 100)

  return (
    <div className="flex h-full flex-col overflow-y-auto border-l bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ActivityIcon className="size-4" />
              Tasks
            </h3>
            <span className="text-[10px] tabular-nums text-muted-foreground/60">
              {completedSteps}/{totalSteps}
            </span>
          </div>
          <div className="space-y-1.5">
            {PROGRESS_STEPS.map((step, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-lg border bg-card p-3",
                  step.status === "active" && "border-primary/20"
                )}
              >
                <span className="mt-0.5 shrink-0">
                  {step.status === "completed" && (
                    <CheckCircle2Icon className="size-4 text-primary/60" />
                  )}
                  {step.status === "active" && (
                    <LoaderIcon className="size-4 text-primary animate-spin" />
                  )}
                  {step.status === "pending" && (
                    <CircleIcon className="size-4 text-muted-foreground/30" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "text-xs leading-tight block",
                      step.status === "completed" && "text-muted-foreground",
                      step.status === "active" && "text-foreground font-medium",
                      step.status === "pending" && "text-muted-foreground/40"
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 mt-0.5 block">
                    {step.status === "completed" && "completed"}
                    {step.status === "active" && "running"}
                    {step.status === "pending" && "queued"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Documents */}
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <FileTextIcon className="size-4" />
            Documents
          </h3>
          <div className="flex gap-2">
            {THREAD_DOCUMENTS.slice(0, 3).map((doc) => (
              <div
                key={doc.name}
                className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-3 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
              >
                <FileTextIcon className="size-5 text-muted-foreground" />
                <span className="text-[11px] font-medium text-foreground text-center leading-tight line-clamp-2">
                  {doc.name.replace(/\.[^.]+$/, "")}
                </span>
                <span className="text-[10px] uppercase text-muted-foreground/60">{doc.type}</span>
              </div>
            ))}
          </div>
          {THREAD_DOCUMENTS.length > 3 && (
            <Dialog>
              <DialogTrigger className="mt-2 w-full rounded-md py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer">
                View all {THREAD_DOCUMENTS.length} documents
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Documents</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
                  {THREAD_DOCUMENTS.map((doc) => (
                    <div
                      key={doc.name}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-3 hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                    >
                      <FileTextIcon className="size-5 text-muted-foreground" />
                      <span className="text-[11px] font-medium text-foreground text-center leading-tight line-clamp-2">
                        {doc.name.replace(/\.[^.]+$/, "")}
                      </span>
                      <span className="text-[10px] uppercase text-muted-foreground/60">{doc.type}</span>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Separator />

        {/* Folder */}
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
    <div className="h-[calc(100vh-var(--header-height))] min-h-0">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={60} minSize={35}>
          <AssistantRuntimeProvider runtime={runtime}>
            <AgentThread
              agent={agent}
              sessionId={activeSessionId}
              restoredMessages={restoredMessages.current}
            />
          </AssistantRuntimeProvider>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40} minSize={20}>
          <ActivityPanel agent={agent} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
