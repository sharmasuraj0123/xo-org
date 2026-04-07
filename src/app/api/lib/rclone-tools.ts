/**
 * Rclone tool operations for agents.
 */

import {
  listRemotes, rcloneLs, rcloneLsjson, rcloneCopy, rcloneMove,
  rcloneSync, rcloneDelete, rcloneMkdir, rcloneRmdir, rcloneCat, rcloneAbout,
} from "./rclone"
import { getActiveConnection } from "./rclone-store"
import type { RcloneToolName, RcloneToolResult, RcloneToolDefinition } from "./types"

export const RCLONE_TOOLS: RcloneToolDefinition[] = [
  // ── Remotes ───────────────────────────────────────────────
  {
    name: "rclone.remotes.list",
    description: "List all configured rclone remotes with their types (e.g. s3, gdrive, dropbox)",
    params: {},
  },
  // ── Listing ───────────────────────────────────────────────
  {
    name: "rclone.ls",
    description: "List files at a remote path with sizes (e.g. 'myremote:bucket/path')",
    params: {
      remotePath: { type: "string", required: true, description: "Remote path — e.g. remote:bucket/folder" },
      maxDepth: { type: "number", required: false, description: "Max directory depth (default: unlimited)" },
    },
  },
  {
    name: "rclone.lsjson",
    description: "List files at a remote path as structured JSON with metadata (size, modTime, isDir)",
    params: {
      remotePath: { type: "string", required: true, description: "Remote path — e.g. remote:bucket/folder" },
      maxDepth: { type: "number", required: false, description: "Max directory depth (default: unlimited)" },
    },
  },
  // ── Copy / Move / Sync ────────────────────────────────────
  {
    name: "rclone.copy",
    description: "Copy files from source to destination (does not delete from source)",
    params: {
      source: { type: "string", required: true, description: "Source path — e.g. remote:bucket/file.txt or /local/path" },
      dest: { type: "string", required: true, description: "Destination path — e.g. remote:bucket/folder or /local/path" },
    },
  },
  {
    name: "rclone.move",
    description: "Move files from source to destination (deletes from source after transfer)",
    params: {
      source: { type: "string", required: true, description: "Source path" },
      dest: { type: "string", required: true, description: "Destination path" },
    },
  },
  {
    name: "rclone.sync",
    description: "Sync source to destination — makes destination identical to source (destructive: deletes extra files in dest)",
    params: {
      source: { type: "string", required: true, description: "Source path" },
      dest: { type: "string", required: true, description: "Destination path" },
    },
  },
  // ── Delete ────────────────────────────────────────────────
  {
    name: "rclone.delete",
    description: "Delete files at a remote path (removes files but not directories)",
    params: {
      remotePath: { type: "string", required: true, description: "Remote path to delete files from" },
    },
  },
  // ── Directories ───────────────────────────────────────────
  {
    name: "rclone.mkdir",
    description: "Create a directory at a remote path",
    params: {
      remotePath: { type: "string", required: true, description: "Remote path — e.g. remote:bucket/new-folder" },
    },
  },
  {
    name: "rclone.rmdir",
    description: "Remove an empty directory at a remote path",
    params: {
      remotePath: { type: "string", required: true, description: "Remote path to remove" },
    },
  },
  // ── Read ──────────────────────────────────────────────────
  {
    name: "rclone.cat",
    description: "Read the contents of a remote file (first 100 KB)",
    params: {
      remotePath: { type: "string", required: true, description: "Remote file path — e.g. remote:bucket/file.txt" },
    },
  },
  // ── Info ──────────────────────────────────────────────────
  {
    name: "rclone.about",
    description: "Get storage space usage for a remote (used, free, total, trashed)",
    params: {
      remote: { type: "string", required: true, description: "Remote name (without colon) — e.g. 'myremote'" },
    },
  },
]

// ─── Tool Executor ───────────────────────────────────────────

export async function executeRcloneTool(
  tool: RcloneToolName,
  params: Record<string, unknown>
): Promise<RcloneToolResult> {
  const conn = getActiveConnection()
  if (!conn) return { tool, ok: false, error: "No active rclone connection" }

  try {
    switch (tool) {
      case "rclone.remotes.list": return await execRemotesList(tool)
      case "rclone.ls": return await execLs(tool, params)
      case "rclone.lsjson": return await execLsjson(tool, params)
      case "rclone.copy": return await execCopy(tool, params)
      case "rclone.move": return await execMove(tool, params)
      case "rclone.sync": return await execSync(tool, params)
      case "rclone.delete": return await execDelete(tool, params)
      case "rclone.mkdir": return await execMkdir(tool, params)
      case "rclone.rmdir": return await execRmdir(tool, params)
      case "rclone.cat": return await execCat(tool, params)
      case "rclone.about": return await execAbout(tool, params)
      default: return { tool, ok: false, error: `Unknown tool: ${tool}` }
    }
  } catch (err) {
    return { tool, ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function ok(tool: RcloneToolName, data: unknown): RcloneToolResult {
  return { tool, ok: true, data }
}

// ─── Remotes ────────────────────────────────────────────────

async function execRemotesList(tool: RcloneToolName): Promise<RcloneToolResult> {
  const remotes = await listRemotes()
  return ok(tool, { remotes })
}

// ─── Listing ────────────────────────────────────────────────

async function execLs(tool: RcloneToolName, p: Record<string, unknown>): Promise<RcloneToolResult> {
  const out = await rcloneLs(p.remotePath as string, p.maxDepth as number | undefined)
  const files = out.trim().split("\n").filter(Boolean).map((line) => {
    const match = line.match(/^\s*(\d+)\s+(.+)$/)
    if (!match) return { size: 0, path: line.trim() }
    return { size: Number(match[1]), path: match[2] }
  })
  return ok(tool, { files, count: files.length })
}

async function execLsjson(tool: RcloneToolName, p: Record<string, unknown>): Promise<RcloneToolResult> {
  const items = await rcloneLsjson(p.remotePath as string, p.maxDepth as number | undefined)
  return ok(tool, { items, count: Array.isArray(items) ? items.length : 0 })
}

// ─── Copy / Move / Sync ────────────────────────────────────

async function execCopy(tool: RcloneToolName, p: Record<string, unknown>): Promise<RcloneToolResult> {
  await rcloneCopy(p.source as string, p.dest as string)
  return ok(tool, { copied: true, source: p.source, dest: p.dest })
}

async function execMove(tool: RcloneToolName, p: Record<string, unknown>): Promise<RcloneToolResult> {
  await rcloneMove(p.source as string, p.dest as string)
  return ok(tool, { moved: true, source: p.source, dest: p.dest })
}

async function execSync(tool: RcloneToolName, p: Record<string, unknown>): Promise<RcloneToolResult> {
  await rcloneSync(p.source as string, p.dest as string)
  return ok(tool, { synced: true, source: p.source, dest: p.dest })
}

// ─── Delete ─────────────────────────────────────────────────

async function execDelete(tool: RcloneToolName, p: Record<string, unknown>): Promise<RcloneToolResult> {
  await rcloneDelete(p.remotePath as string)
  return ok(tool, { deleted: true, remotePath: p.remotePath })
}

// ─── Directories ────────────────────────────────────────────

async function execMkdir(tool: RcloneToolName, p: Record<string, unknown>): Promise<RcloneToolResult> {
  await rcloneMkdir(p.remotePath as string)
  return ok(tool, { created: true, remotePath: p.remotePath })
}

async function execRmdir(tool: RcloneToolName, p: Record<string, unknown>): Promise<RcloneToolResult> {
  await rcloneRmdir(p.remotePath as string)
  return ok(tool, { removed: true, remotePath: p.remotePath })
}

// ─── Read ───────────────────────────────────────────────────

async function execCat(tool: RcloneToolName, p: Record<string, unknown>): Promise<RcloneToolResult> {
  const content = await rcloneCat(p.remotePath as string)
  return ok(tool, { content, bytes: content.length, remotePath: p.remotePath })
}

// ─── Info ───────────────────────────────────────────────────

async function execAbout(tool: RcloneToolName, p: Record<string, unknown>): Promise<RcloneToolResult> {
  const info = await rcloneAbout(p.remote as string)
  return ok(tool, info)
}
