import { NextRequest, NextResponse } from "next/server"
import fs from "node:fs"
import path from "node:path"

// Root directory for the file browser — defaults to project root
const STORAGE_ROOT = process.env.XO_STORAGE_ROOT || process.cwd()

type FSEntry = {
  name: string
  type: "folder" | "file"
  size: string
  modified: string
  extension: string
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const val = bytes / Math.pow(1024, i)
  return `${val < 10 ? val.toFixed(1) : Math.round(val)} ${units[i]}`
}

function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diffMs = now - date.getTime()
  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (months > 0) return `${months}mo ago`
  if (weeks > 0) return `${weeks}w ago`
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return "just now"
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const relativePath = searchParams.get("path") || ""

  // Resolve and validate the path stays within STORAGE_ROOT
  const targetPath = path.resolve(STORAGE_ROOT, relativePath)
  if (!targetPath.startsWith(path.resolve(STORAGE_ROOT))) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 })
  }

  try {
    const stat = await fs.promises.stat(targetPath)
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: "Not a directory" }, { status: 400 })
    }

    const dirEntries = await fs.promises.readdir(targetPath, { withFileTypes: true })

    const entries: FSEntry[] = []

    for (const entry of dirEntries) {
      // Skip hidden files/folders starting with . (except .env-like files at root)
      if (entry.name.startsWith(".") && relativePath !== "") continue
      // Always skip .git, node_modules, .next, .claude
      if ([".git", "node_modules", ".next", ".claude", "__pycache__", ".turbo"].includes(entry.name)) continue

      try {
        const entryPath = path.join(targetPath, entry.name)
        const entryStat = await fs.promises.stat(entryPath)

        entries.push({
          name: entry.name,
          type: entry.isDirectory() ? "folder" : "file",
          size: entry.isDirectory() ? "" : formatSize(entryStat.size),
          modified: formatRelativeTime(entryStat.mtime),
          extension: entry.isDirectory() ? "" : path.extname(entry.name).slice(1),
        })
      } catch {
        // Skip entries we can't stat (permission errors, broken symlinks, etc.)
        continue
      }
    }

    // Sort: folders first, then files, alphabetically within each group
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      path: relativePath || "/",
      root: path.basename(STORAGE_ROOT),
      entries,
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Directory not found" }, { status: 404 })
    }
    return NextResponse.json({ error: "Failed to read directory" }, { status: 500 })
  }
}
