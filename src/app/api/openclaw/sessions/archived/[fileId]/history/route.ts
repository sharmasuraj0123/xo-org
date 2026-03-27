import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import readline from "readline"

/**
 * Reads messages from an archived (.reset) session file.
 *
 * Query params:
 *   limit   - max messages to return (default 200)
 *
 * Route param:
 *   fileId  - URL-encoded fileName (e.g. "8d010c56...jsonl.reset.2026-...")
 */

const SESSIONS_DIR =
  process.env.OPENCLAW_SESSIONS_DIR ||
  path.join(process.env.HOME || "/home/coder", ".openclaw/agents/main/sessions")

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

async function readAllMessages(filePath: string): Promise<GatewayMessage[]> {
  return new Promise((resolve, reject) => {
    const messages: GatewayMessage[] = []

    try {
      const stream = fs.createReadStream(filePath)
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })

      rl.on("line", (line) => {
        if (!line.trim()) return
        try {
          const entry = JSON.parse(line)
          const msg = entry?.message
          if (!msg) return

          const role = msg.role
          if (!role) return

          // Map the JSONL envelope format to our GatewayMessage shape
          if (role === "user" || role === "assistant") {
            const content: MessageContent[] = Array.isArray(msg.content) ? msg.content : []
            messages.push({
              role,
              content,
              timestamp: entry.timestamp ? new Date(entry.timestamp).getTime() : undefined,
              model: msg.model,
              usage: msg.usage,
            })
          } else if (role === "toolCall") {
            // Tool calls are embedded in assistant messages; skip as standalone
          } else if (role === "toolResult") {
            messages.push({
              role: "toolResult",
              content: Array.isArray(msg.content) ? msg.content : [],
              timestamp: entry.timestamp ? new Date(entry.timestamp).getTime() : undefined,
              toolName: msg.toolName,
              toolCallId: msg.toolCallId,
              isError: msg.isError,
            })
          }
        } catch {
          // skip malformed lines
        }
      })

      rl.on("close", () => resolve(messages))
      rl.on("error", reject)
      stream.on("error", reject)
    } catch (err) {
      reject(err)
    }
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params
  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "200", 10)

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 })
  }

  // Decode and sanitize — only allow filenames in the sessions dir, no path traversal
  let fileName: string
  try {
    fileName = decodeURIComponent(fileId)
  } catch {
    return NextResponse.json({ error: "Invalid fileId encoding" }, { status: 400 })
  }

  // Security: ensure no directory traversal
  if (fileName.includes("/") || fileName.includes("..") || !fileName.includes(".jsonl.reset.")) {
    return NextResponse.json({ error: "Invalid fileId" }, { status: 400 })
  }

  const filePath = path.join(SESSIONS_DIR, fileName)

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: `Archived session not found: ${fileName}` }, { status: 404 })
  }

  try {
    const all = await readAllMessages(filePath)
    // Return last `limit` messages (most recent)
    const messages = all.slice(-limit)

    return NextResponse.json({
      fileName,
      messageCount: all.length,
      messages,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Failed to read archived session: ${message}` }, { status: 500 })
  }
}
