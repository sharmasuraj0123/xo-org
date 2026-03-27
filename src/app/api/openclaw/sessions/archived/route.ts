import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import readline from "readline"

/**
 * Returns a list of archived (reset) OpenClaw sessions by scanning the sessions
 * directory for *.jsonl.reset.* files.
 *
 * Each entry contains:
 *   fileId      - stable base filename (without the .reset.<timestamp> suffix) used as URL param
 *   fileName    - full filename on disk
 *   sessionKey  - extracted from messages inside the file (best effort)
 *   sessionId   - extracted from messages (best effort)
 *   archivedAt  - ISO timestamp from the .reset.<timestamp> suffix
 *   sizeBytes   - file size
 *   messageCount - approximate (sampled, not full parse)
 */

const SESSIONS_DIR =
  process.env.OPENCLAW_SESSIONS_DIR ||
  path.join(process.env.HOME || "/home/coder", ".openclaw/agents/main/sessions")

export type ArchivedSession = {
  fileId: string
  fileName: string
  sessionKey: string | null
  sessionId: string | null
  origin: { provider?: string; label?: string } | null
  archivedAt: string
  sizeBytes: number
}

/**
 * Quickly peek at the first few messages in a .reset file to extract
 * session metadata without reading the whole (potentially huge) file.
 */
async function peekSessionMeta(filePath: string): Promise<{
  sessionKey: string | null
  sessionId: string | null
  origin: { provider?: string; label?: string } | null
}> {
  return new Promise((resolve) => {
    const result: {
      sessionKey: string | null
      sessionId: string | null
      origin: { provider?: string; label?: string } | null
    } = { sessionKey: null, sessionId: null, origin: null }

    try {
      const stream = fs.createReadStream(filePath, { start: 0, end: 8000 })
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity })
      let lines = 0

      rl.on("line", (line) => {
        lines++
        if (lines > 40) {
          rl.close()
          stream.destroy()
          return
        }
        try {
          const entry = JSON.parse(line)
          const msg = entry?.message

          // sessions_list result carries session info in tool results
          if (msg?.role === "message" || msg?.role === "assistant" || msg?.role === "user") {
            // Try to find session key from tool results or content
          }

          // Direct session metadata sometimes stored in the envelope
          if (entry?.sessionKey && !result.sessionKey) {
            result.sessionKey = entry.sessionKey
          }
          if (entry?.sessionId && !result.sessionId) {
            result.sessionId = entry.sessionId
          }

          // Extract from message.origin (inbound context)
          if (msg?.origin && !result.origin) {
            result.origin = msg.origin
          }

          // Try to pull sessionKey from content of any message
          if (!result.sessionKey && msg?.content) {
            const content = Array.isArray(msg.content) ? msg.content : []
            for (const c of content) {
              if (c?.type === "text" && typeof c.text === "string") {
                const match = c.text.match(/sessionKey['":\s]+([a-z0-9:_-]+)/i)
                if (match) result.sessionKey = match[1]
              }
            }
          }
        } catch {
          // skip malformed lines
        }
      })

      rl.on("close", () => resolve(result))
      rl.on("error", () => resolve(result))
      stream.on("error", () => resolve(result))
    } catch {
      resolve(result)
    }
  })
}

/**
 * Count messages quickly by counting newlines in first 100KB.
 */
function estimateLineCount(filePath: string): number {
  try {
    const buf = Buffer.alloc(100 * 1024)
    const fd = fs.openSync(filePath, "r")
    const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0)
    fs.closeSync(fd)
    let count = 0
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 10) count++ // newline
    }
    return count
  } catch {
    return 0
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) {
      return NextResponse.json({ archived: [], count: 0 })
    }

    const files = fs.readdirSync(SESSIONS_DIR)
    const resetFiles = files
      .filter((f) => f.includes(".jsonl.reset."))
      .sort()
      .reverse() // newest first

    const archived: ArchivedSession[] = []

    for (const fileName of resetFiles) {
      const filePath = path.join(SESSIONS_DIR, fileName)
      let stat: fs.Stats
      try {
        stat = fs.statSync(filePath)
      } catch {
        continue
      }

      // Extract archivedAt from filename: foo.jsonl.reset.2026-03-27T07-58-29.710Z
      const resetMatch = fileName.match(/\.reset\.(.+)$/)
      const archivedAt = resetMatch
        ? resetMatch[1].replace(/-(\d{2})-(\d{2})\./, "T$1:$2.").replace("T", "T") // already ISO-ish
        : new Date(stat.mtimeMs).toISOString()

      // fileId = base name without the .reset.<ts> suffix — used as stable URL param
      const fileId = encodeURIComponent(fileName)

      const meta = await peekSessionMeta(filePath)

      archived.push({
        fileId,
        fileName,
        sessionKey: meta.sessionKey,
        sessionId: meta.sessionId,
        origin: meta.origin,
        archivedAt,
        sizeBytes: stat.size,
      })
    }

    return NextResponse.json({ archived, count: archived.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
