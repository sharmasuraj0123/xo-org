/**
 * MCP (Model Context Protocol) client.
 *
 * Supports two transports:
 *  - HTTP (Streamable HTTP): POST JSON-RPC to a server URL
 *  - Stdio: spawn a local process and communicate via stdin/stdout
 *
 * Protocol: JSON-RPC 2.0  •  Spec version: 2024-11-05
 */

import { spawn, type ChildProcess } from "node:child_process"
import type { McpServerConfig, McpToolDefinition } from "./types"

// ─── JSON-RPC Types ──────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: "2.0"
  id: number
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: "2.0"
  id: number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

interface JsonRpcNotification {
  jsonrpc: "2.0"
  method: string
  params?: Record<string, unknown>
}

// ─── Shared State ────────────────────────────────────────────

let requestId = 0
function nextId(): number {
  return ++requestId
}

const CLIENT_INFO = {
  name: "xo-org",
  version: "1.0.0",
}

// ─── HTTP Transport ──────────────────────────────────────────

async function httpRequest(
  url: string,
  method: string,
  params?: Record<string, unknown>,
  apiKey?: string
): Promise<unknown> {
  const body: JsonRpcRequest = {
    jsonrpc: "2.0",
    id: nextId(),
    method,
    ...(params ? { params } : {}),
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) {
    throw new Error(`MCP HTTP ${res.status}: ${await res.text()}`)
  }

  const data = (await res.json()) as JsonRpcResponse
  if (data.error) {
    throw new Error(`MCP RPC error ${data.error.code}: ${data.error.message}`)
  }
  return data.result
}

// ─── Stdio Transport ─────────────────────────────────────────

/** Active stdio processes keyed by server ID */
const stdioProcesses = new Map<string, ChildProcess>()

function stdioRequest(
  serverId: string,
  command: string,
  args: string[],
  method: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let proc = stdioProcesses.get(serverId)

    // Spawn if not running
    if (!proc || proc.killed || proc.exitCode !== null) {
      proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env },
      })
      stdioProcesses.set(serverId, proc)

      proc.on("error", (err) => {
        stdioProcesses.delete(serverId)
        reject(err)
      })
    }

    const body: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: nextId(),
      method,
      ...(params ? { params } : {}),
    }

    const reqId = body.id
    let buffer = ""

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString()
      // JSON-RPC messages are newline-delimited
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const msg = JSON.parse(line) as JsonRpcResponse | JsonRpcNotification
          if ("id" in msg && msg.id === reqId) {
            proc!.stdout!.off("data", onData)
            if (msg.error) {
              reject(new Error(`MCP RPC error ${msg.error.code}: ${msg.error.message}`))
            } else {
              resolve(msg.result)
            }
          }
          // Ignore notifications and other responses
        } catch {
          // Not valid JSON yet, keep buffering
        }
      }
    }

    proc.stdout!.on("data", onData)

    // Timeout
    const timeout = setTimeout(() => {
      proc!.stdout!.off("data", onData)
      reject(new Error("MCP stdio request timed out after 30s"))
    }, 30_000)

    proc.stdout!.once("data", () => {
      // Reset timeout on first data
    })

    // Clean up timeout on resolution
    const origResolve = resolve
    const origReject = reject
    resolve = (val) => { clearTimeout(timeout); origResolve(val) }
    reject = (err) => { clearTimeout(timeout); origReject(err) }

    proc.stdin!.write(JSON.stringify(body) + "\n")
  })
}

/** Kill a stdio process for a server */
export function killStdioProcess(serverId: string): void {
  const proc = stdioProcesses.get(serverId)
  if (proc && !proc.killed) {
    proc.kill("SIGTERM")
  }
  stdioProcesses.delete(serverId)
}

// ─── Unified Request ─────────────────────────────────────────

async function mcpRequest(
  config: McpServerConfig,
  method: string,
  params?: Record<string, unknown>
): Promise<unknown> {
  if (config.transport === "http") {
    if (!config.url) throw new Error("HTTP transport requires a URL")
    return httpRequest(config.url, method, params, config.apiKey)
  }
  if (config.transport === "stdio") {
    if (!config.command) throw new Error("Stdio transport requires a command")
    return stdioRequest(config.id, config.command, config.args ?? [], method, params)
  }
  throw new Error(`Unknown transport: ${config.transport}`)
}

// ─── MCP Protocol Operations ─────────────────────────────────

export interface McpInitResult {
  serverName: string
  serverVersion: string
  protocolVersion: string
}

export async function mcpInitialize(config: McpServerConfig): Promise<McpInitResult> {
  const result = (await mcpRequest(config, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: CLIENT_INFO,
  })) as {
    serverInfo?: { name?: string; version?: string }
    protocolVersion?: string
  }

  // Send initialized notification (fire-and-forget for HTTP)
  try {
    await mcpRequest(config, "notifications/initialized")
  } catch {
    // Some servers don't handle this — ignore
  }

  return {
    serverName: result?.serverInfo?.name ?? config.name ?? "Unknown",
    serverVersion: result?.serverInfo?.version ?? "unknown",
    protocolVersion: result?.protocolVersion ?? "2024-11-05",
  }
}

export async function mcpListTools(config: McpServerConfig): Promise<McpToolDefinition[]> {
  const result = (await mcpRequest(config, "tools/list")) as {
    tools?: McpToolDefinition[]
  }
  return result?.tools ?? []
}

export async function mcpCallTool(
  config: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const result = (await mcpRequest(config, "tools/call", {
    name: toolName,
    arguments: args,
  })) as {
    content?: Array<{ type: string; text?: string; data?: unknown }>
    isError?: boolean
  }

  if (result?.isError) {
    const errorText = result.content
      ?.filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n") ?? "Tool execution failed"
    throw new Error(errorText)
  }

  // Extract content
  if (!result?.content || result.content.length === 0) return {}

  // If single text result, return as string
  if (result.content.length === 1 && result.content[0].type === "text") {
    return { text: result.content[0].text }
  }

  // Return full content array for multi-part results
  return { content: result.content }
}
