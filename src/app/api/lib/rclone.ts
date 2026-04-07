/**
 * Rclone CLI helpers.
 *
 * Unlike other connectors, rclone is a local CLI tool — no OAuth needed.
 * "Connecting" means detecting the binary and reading its config.
 */

import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type { RcloneRemote } from "./types"

const execFileAsync = promisify(execFile)

// ─── Config ──────────────────────────────────────────────────

const RCLONE_PATH = process.env.RCLONE_PATH ?? "rclone"
const RCLONE_CONFIG = process.env.RCLONE_CONFIG ?? ""

// ─── Configuration Check ─────────────────────────────────────

export function isRcloneConfigured(): boolean {
  // Rclone just needs the binary — no API keys required
  return true
}

// ─── CLI Execution Helper ────────────────────────────────────

function baseArgs(): string[] {
  const args: string[] = []
  if (RCLONE_CONFIG) args.push("--config", RCLONE_CONFIG)
  return args
}

export async function rcloneExec(
  subcommand: string,
  args: string[] = [],
  options: { timeout?: number } = {}
): Promise<string> {
  const allArgs = [...baseArgs(), subcommand, ...args]
  const { stdout } = await execFileAsync(RCLONE_PATH, allArgs, {
    timeout: options.timeout ?? 30_000,
    maxBuffer: 10 * 1024 * 1024, // 10 MB
  })
  return stdout
}

// ─── Detection ───────────────────────────────────────────────

export async function getRcloneVersion(): Promise<string> {
  const out = await rcloneExec("version")
  // First line: "rclone v1.65.0"
  const match = out.match(/rclone\s+(v[\d.]+)/)
  return match?.[1] ?? out.split("\n")[0].trim()
}

export async function getRcloneConfigPath(): Promise<string> {
  const out = await rcloneExec("config", ["file"])
  // Output: "Configuration file is stored at:\n/path/to/rclone.conf"
  const lines = out.trim().split("\n")
  return lines[lines.length - 1].trim()
}

export async function listRemotes(): Promise<RcloneRemote[]> {
  const out = await rcloneExec("listremotes", ["--long"])
  // Each line: "remote_name: type"
  return out
    .trim()
    .split("\n")
    .filter((line) => line.includes(":"))
    .map((line) => {
      const [name, type] = line.split(":").map((s) => s.trim())
      return { name: name.replace(/:$/, ""), type: type ?? "unknown" }
    })
}

// ─── File Operations ─────────────────────────────────────────

export async function rcloneLs(
  remotePath: string,
  maxDepth?: number
): Promise<string> {
  const args = [remotePath]
  if (maxDepth !== undefined) args.push("--max-depth", String(maxDepth))
  return rcloneExec("ls", args)
}

export async function rcloneLsjson(
  remotePath: string,
  maxDepth?: number
): Promise<unknown[]> {
  const args = [remotePath]
  if (maxDepth !== undefined) args.push("--max-depth", String(maxDepth))
  const out = await rcloneExec("lsjson", args)
  return JSON.parse(out)
}

export async function rcloneCopy(
  source: string,
  dest: string
): Promise<string> {
  return rcloneExec("copy", [source, dest, "--progress=false"])
}

export async function rcloneMove(
  source: string,
  dest: string
): Promise<string> {
  return rcloneExec("move", [source, dest, "--progress=false"])
}

export async function rcloneSync(
  source: string,
  dest: string
): Promise<string> {
  return rcloneExec("sync", [source, dest, "--progress=false"])
}

export async function rcloneDelete(remotePath: string): Promise<string> {
  return rcloneExec("delete", [remotePath])
}

export async function rcloneMkdir(remotePath: string): Promise<string> {
  return rcloneExec("mkdir", [remotePath])
}

export async function rcloneRmdir(remotePath: string): Promise<string> {
  return rcloneExec("rmdir", [remotePath])
}

export async function rcloneCat(remotePath: string): Promise<string> {
  return rcloneExec("cat", [remotePath, "--head", "102400"]) // 100 KB max
}

export async function rcloneAbout(remote: string): Promise<unknown> {
  const out = await rcloneExec("about", [`${remote}:`, "--json"])
  return JSON.parse(out)
}
