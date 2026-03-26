"use client"

import { useState, useEffect, useCallback } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  FolderIcon,
  FolderOpenIcon,
  FileIcon,
  FileTextIcon,
  FileCodeIcon,
  ImageIcon,
  TableIcon,
  ChevronRightIcon,
  HomeIcon,
  LoaderIcon,
  AlertCircleIcon,
  FileArchiveIcon,
  FileJsonIcon,
  TerminalIcon,
} from "lucide-react"

type FSEntry = {
  name: string
  type: "folder" | "file"
  size: string
  modified: string
  extension: string
}

type StorageResponse = {
  path: string
  root: string
  entries: FSEntry[]
  error?: string
}

function getFileIcon(extension: string) {
  switch (extension) {
    case "md":
    case "txt":
    case "pdf":
    case "doc":
    case "docx":
      return FileTextIcon
    case "json":
      return FileJsonIcon
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "py":
    case "rb":
    case "go":
    case "rs":
    case "yml":
    case "yaml":
    case "toml":
    case "env":
    case "example":
    case "lock":
      return FileCodeIcon
    case "sh":
    case "bash":
    case "zsh":
      return TerminalIcon
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
    case "gif":
    case "webp":
    case "ico":
      return ImageIcon
    case "csv":
    case "xlsx":
    case "xls":
      return TableIcon
    case "zip":
    case "tar":
    case "gz":
    case "rar":
    case "7z":
      return FileArchiveIcon
    default:
      return FileIcon
  }
}

export default function StoragePage() {
  const [path, setPath] = useState<string[]>([])
  const [entries, setEntries] = useState<FSEntry[]>([])
  const [rootName, setRootName] = useState("storage")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEntries = useCallback(async (segments: string[]) => {
    setLoading(true)
    setError(null)
    try {
      const relativePath = segments.join("/")
      const res = await fetch(`/api/storage?path=${encodeURIComponent(relativePath)}`)
      const data: StorageResponse = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to load directory")
        setEntries([])
      } else {
        setEntries(data.entries)
        setRootName(data.root)
      }
    } catch {
      setError("Failed to connect to server")
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries(path)
  }, [path, fetchEntries])

  const navigateTo = (segments: string[]) => {
    setPath(segments)
  }

  const folders = entries.filter((e) => e.type === "folder")
  const files = entries.filter((e) => e.type === "file")

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "calc(var(--spacing) * 72)", "--header-height": "calc(var(--spacing) * 12)" } as React.CSSProperties}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Storage" />
        <div className="flex flex-1 flex-col p-4 lg:p-6">
          {/* Breadcrumb toolbar */}
          <div className="flex items-center justify-between mb-4">
            <nav className="flex items-center gap-1 text-sm min-w-0 overflow-x-auto">
              <button
                onClick={() => navigateTo([])}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded-md hover:bg-muted/50 shrink-0"
              >
                <HomeIcon className="size-3.5" />
                <span className="font-medium">{rootName}</span>
              </button>
              {path.map((segment, i) => (
                <span key={`${segment}-${i}`} className="flex items-center gap-1 shrink-0">
                  <ChevronRightIcon className="size-3 text-muted-foreground/50" />
                  <button
                    onClick={() => navigateTo(path.slice(0, i + 1))}
                    className={`px-1.5 py-1 rounded-md transition-colors ${
                      i === path.length - 1
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {segment}
                  </button>
                </span>
              ))}
            </nav>

            <div className="flex items-center gap-2 shrink-0 ml-4">
              <span className="text-xs text-muted-foreground/40 tabular-nums">
                {!loading && `${entries.length} items`}
              </span>
            </div>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-3 px-3 py-1.5 text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider border-b border-border/30 mb-1">
            <span className="flex-1">Name</span>
            <span className="w-20 text-right">Size</span>
            <span className="w-20 text-right">Modified</span>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-16">
              <LoaderIcon className="size-5 text-muted-foreground/50 animate-spin" />
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
              <AlertCircleIcon className="size-10 mb-3 text-destructive/50" />
              <span className="text-sm">{error}</span>
              <button
                onClick={() => fetchEntries(path)}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* File list */}
          {!loading && !error && (
            <div className="flex flex-col">
              {/* Back button */}
              {path.length > 0 && (
                <button
                  onClick={() => navigateTo(path.slice(0, -1))}
                  className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-lg transition-colors group"
                >
                  <FolderIcon className="size-4 text-muted-foreground/50" />
                  <span className="text-sm">..</span>
                </button>
              )}

              {/* Folders */}
              {folders.map((folder) => (
                <button
                  key={folder.name}
                  onClick={() => navigateTo([...path, folder.name])}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 rounded-lg transition-colors group text-left"
                >
                  <FolderIcon className="size-4 text-primary/70 group-hover:hidden shrink-0" />
                  <FolderOpenIcon className="size-4 text-primary hidden group-hover:block shrink-0" />
                  <span className="flex-1 text-sm font-medium min-w-0 truncate">{folder.name}</span>
                  <span className="w-20 text-right text-xs text-muted-foreground/40">&mdash;</span>
                  <span className="w-20 text-right text-xs text-muted-foreground/50">{folder.modified}</span>
                </button>
              ))}

              {/* Files */}
              {files.map((file) => {
                const Icon = getFileIcon(file.extension)
                return (
                  <div
                    key={file.name}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 rounded-lg transition-colors cursor-default"
                  >
                    <Icon className="size-4 text-muted-foreground/60 shrink-0" />
                    <span className="flex-1 text-sm font-mono text-foreground/90 min-w-0 truncate">{file.name}</span>
                    <span className="w-20 text-right text-xs text-muted-foreground/50 tabular-nums">{file.size}</span>
                    <span className="w-20 text-right text-xs text-muted-foreground/50">{file.modified}</span>
                  </div>
                )
              })}

              {/* Empty folder */}
              {entries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/50">
                  <FolderOpenIcon className="size-10 mb-3" />
                  <span className="text-sm">This folder is empty</span>
                </div>
              )}
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
