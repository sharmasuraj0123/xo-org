/**
 * Gmail tool operations for agents.
 *
 * Every Gmail operation an agent can perform. Each tool uses
 * gmailFetch() for authenticated requests. Agents call these
 * via POST /api/gmail/tools.
 */

import { gmailFetch } from "./gmail"
import { getValidAccessToken } from "./gmail-store"
import type { GmailToolName, GmailToolResult, GmailToolDefinition } from "./types"

// ─── Tool Registry ───────────────────────────────────────────

export const GMAIL_TOOLS: GmailToolDefinition[] = [
  // ── Messages ───────────────────────────────────────────────
  {
    name: "gmail.messages.list",
    description: "List or search emails using Gmail search syntax (e.g. is:unread, from:user@example.com, has:attachment)",
    params: {
      q: { type: "string", required: false, description: "Gmail search query (e.g. 'is:unread from:boss@company.com')" },
      maxResults: { type: "number", required: false, description: "Max results to return (default 10, max 500)" },
      pageToken: { type: "string", required: false, description: "Token for next page of results" },
      labelIds: { type: "string", required: false, description: "Comma-separated label IDs to filter by (e.g. 'INBOX,UNREAD')" },
    },
  },
  {
    name: "gmail.messages.get",
    description: "Get a full email message with headers, body, and attachment metadata",
    params: {
      id: { type: "string", required: true, description: "Message ID" },
      format: { type: "string", required: false, description: "Response format: full, metadata, minimal, raw (default: full)" },
    },
  },
  {
    name: "gmail.messages.send",
    description: "Send an email. Constructs an RFC 2822 message and sends it",
    params: {
      to: { type: "string", required: true, description: "Recipient email address" },
      subject: { type: "string", required: true, description: "Email subject" },
      body: { type: "string", required: true, description: "Email body (plain text)" },
      cc: { type: "string", required: false, description: "CC recipients (comma-separated)" },
      bcc: { type: "string", required: false, description: "BCC recipients (comma-separated)" },
      replyTo: { type: "string", required: false, description: "Reply-to address" },
      inReplyTo: { type: "string", required: false, description: "Message-ID of the email being replied to" },
      threadId: { type: "string", required: false, description: "Thread ID to send the reply in" },
    },
  },
  {
    name: "gmail.messages.modify",
    description: "Modify a message's labels (archive, mark read/unread, star, etc.)",
    params: {
      id: { type: "string", required: true, description: "Message ID" },
      addLabelIds: { type: "array", required: false, description: "Label IDs to add (e.g. ['STARRED', 'IMPORTANT'])" },
      removeLabelIds: { type: "array", required: false, description: "Label IDs to remove (e.g. ['INBOX', 'UNREAD'])" },
    },
  },
  {
    name: "gmail.messages.trash",
    description: "Move a message to trash",
    params: {
      id: { type: "string", required: true, description: "Message ID" },
    },
  },
  {
    name: "gmail.messages.untrash",
    description: "Remove a message from trash",
    params: {
      id: { type: "string", required: true, description: "Message ID" },
    },
  },

  // ── Drafts ─────────────────────────────────────────────────
  {
    name: "gmail.drafts.create",
    description: "Create a draft email for review before sending",
    params: {
      to: { type: "string", required: true, description: "Recipient email address" },
      subject: { type: "string", required: true, description: "Email subject" },
      body: { type: "string", required: true, description: "Email body (plain text)" },
      cc: { type: "string", required: false, description: "CC recipients (comma-separated)" },
    },
  },
  {
    name: "gmail.drafts.list",
    description: "List draft emails",
    params: {
      maxResults: { type: "number", required: false, description: "Max results (default 10)" },
    },
  },

  // ── Labels ─────────────────────────────────────────────────
  {
    name: "gmail.labels.list",
    description: "List all Gmail labels (inbox, sent, custom labels, etc.)",
    params: {},
  },

  // ── Threads ────────────────────────────────────────────────
  {
    name: "gmail.threads.list",
    description: "List email threads (conversations)",
    params: {
      q: { type: "string", required: false, description: "Gmail search query" },
      maxResults: { type: "number", required: false, description: "Max results (default 10)" },
      pageToken: { type: "string", required: false, description: "Token for next page" },
    },
  },
  {
    name: "gmail.threads.get",
    description: "Get a full email thread with all messages",
    params: {
      id: { type: "string", required: true, description: "Thread ID" },
      format: { type: "string", required: false, description: "Message format: full, metadata, minimal (default: full)" },
    },
  },
]

// ─── Tool Executor ───────────────────────────────────────────

export async function executeGmailTool(
  tool: GmailToolName,
  params: Record<string, unknown>
): Promise<GmailToolResult> {
  const auth = await getValidAccessToken()
  if (!auth) {
    return { tool, ok: false, error: "No active Gmail connection or token expired" }
  }

  try {
    switch (tool) {
      case "gmail.messages.list":
        return await execMessagesList(auth.token, params)
      case "gmail.messages.get":
        return await execMessagesGet(auth.token, params)
      case "gmail.messages.send":
        return await execMessagesSend(auth.token, auth.email, params)
      case "gmail.messages.modify":
        return await execMessagesModify(auth.token, params)
      case "gmail.messages.trash":
        return await execMessagesTrash(auth.token, params)
      case "gmail.messages.untrash":
        return await execMessagesUntrash(auth.token, params)
      case "gmail.drafts.create":
        return await execDraftsCreate(auth.token, auth.email, params)
      case "gmail.drafts.list":
        return await execDraftsList(auth.token, params)
      case "gmail.labels.list":
        return await execLabelsList(auth.token)
      case "gmail.threads.list":
        return await execThreadsList(auth.token, params)
      case "gmail.threads.get":
        return await execThreadsGet(auth.token, params)
      default:
        return { tool, ok: false, error: `Unknown tool: ${tool}` }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { tool, ok: false, error: message }
  }
}

// ─── Helpers ─────────────────────────────────────────────────

async function gmailJson(
  accessToken: string,
  path: string,
  opts?: RequestInit
) {
  const res = await gmailFetch(accessToken, path, opts)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gmail API ${res.status}: ${body}`)
  }
  return res.json()
}

function ok(tool: GmailToolName, data: unknown): GmailToolResult {
  return { tool, ok: true, data }
}

/**
 * Build an RFC 2822 email and base64url-encode it for the Gmail API.
 */
function buildRawEmail(opts: {
  from: string
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
  replyTo?: string
  inReplyTo?: string
}): string {
  const lines: string[] = []
  lines.push(`From: ${opts.from}`)
  lines.push(`To: ${opts.to}`)
  if (opts.cc) lines.push(`Cc: ${opts.cc}`)
  if (opts.bcc) lines.push(`Bcc: ${opts.bcc}`)
  if (opts.replyTo) lines.push(`Reply-To: ${opts.replyTo}`)
  if (opts.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`)
  lines.push(`Subject: ${opts.subject}`)
  lines.push("MIME-Version: 1.0")
  lines.push("Content-Type: text/plain; charset=UTF-8")
  lines.push("")
  lines.push(opts.body)

  const raw = lines.join("\r\n")
  return Buffer.from(raw).toString("base64url")
}

/**
 * Parse email headers from a Gmail message payload.
 */
function parseHeaders(
  headers: Array<{ name: string; value: string }>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const h of headers) {
    const key = h.name.toLowerCase()
    result[key] = h.value
  }
  return result
}

/**
 * Extract plain text body from a Gmail message payload.
 */
function extractBody(payload: Record<string, unknown>): string {
  // Simple text/plain
  if (payload.mimeType === "text/plain" && payload.body) {
    const body = payload.body as Record<string, unknown>
    if (body.data) {
      return Buffer.from(body.data as string, "base64url").toString("utf-8")
    }
  }

  // Multipart — recurse through parts
  if (payload.parts) {
    const parts = payload.parts as Array<Record<string, unknown>>
    // Prefer text/plain
    for (const part of parts) {
      if (part.mimeType === "text/plain") {
        const body = part.body as Record<string, unknown>
        if (body?.data) {
          return Buffer.from(body.data as string, "base64url").toString("utf-8")
        }
      }
    }
    // Fall back to text/html
    for (const part of parts) {
      if (part.mimeType === "text/html") {
        const body = part.body as Record<string, unknown>
        if (body?.data) {
          return Buffer.from(body.data as string, "base64url").toString("utf-8")
        }
      }
    }
    // Nested multipart
    for (const part of parts) {
      const nested = extractBody(part)
      if (nested) return nested
    }
  }

  return ""
}

// ─── Message Operations ──────────────────────────────────────

async function execMessagesList(
  token: string,
  p: Record<string, unknown>
): Promise<GmailToolResult> {
  const params = new URLSearchParams()
  if (p.q) params.set("q", p.q as string)
  params.set("maxResults", String(p.maxResults ?? 10))
  if (p.pageToken) params.set("pageToken", p.pageToken as string)
  if (p.labelIds) {
    for (const label of (p.labelIds as string).split(",")) {
      params.append("labelIds", label.trim())
    }
  }

  const data = await gmailJson(token, `/users/me/messages?${params}`)

  if (!data.messages || data.messages.length === 0) {
    return ok("gmail.messages.list", {
      messages: [],
      resultSizeEstimate: 0,
      nextPageToken: null,
    })
  }

  // Fetch metadata for each message (batch in parallel, max 10)
  const messageIds = data.messages.slice(0, 20) as Array<{ id: string }>
  const details = await Promise.all(
    messageIds.map(async (msg) => {
      const detail = await gmailJson(
        token,
        `/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`
      )
      const headers = parseHeaders(detail.payload?.headers ?? [])
      return {
        id: detail.id,
        threadId: detail.threadId,
        snippet: detail.snippet,
        from: headers.from ?? "",
        to: headers.to ?? "",
        subject: headers.subject ?? "(no subject)",
        date: headers.date ?? "",
        labelIds: detail.labelIds ?? [],
        isUnread: (detail.labelIds ?? []).includes("UNREAD"),
      }
    })
  )

  return ok("gmail.messages.list", {
    messages: details,
    resultSizeEstimate: data.resultSizeEstimate,
    nextPageToken: data.nextPageToken ?? null,
  })
}

async function execMessagesGet(
  token: string,
  p: Record<string, unknown>
): Promise<GmailToolResult> {
  const format = p.format ?? "full"
  const data = await gmailJson(
    token,
    `/users/me/messages/${p.id}?format=${format}`
  )

  const headers = parseHeaders(data.payload?.headers ?? [])
  const body = extractBody(data.payload ?? {})

  // Extract attachment metadata
  const attachments: Array<{ filename: string; mimeType: string; size: number; attachmentId: string }> = []
  function findAttachments(payload: Record<string, unknown>) {
    if (payload.filename && (payload.filename as string).length > 0) {
      const bodyData = payload.body as Record<string, unknown>
      attachments.push({
        filename: payload.filename as string,
        mimeType: payload.mimeType as string,
        size: (bodyData?.size as number) ?? 0,
        attachmentId: (bodyData?.attachmentId as string) ?? "",
      })
    }
    if (payload.parts) {
      for (const part of payload.parts as Array<Record<string, unknown>>) {
        findAttachments(part)
      }
    }
  }
  findAttachments(data.payload ?? {})

  return ok("gmail.messages.get", {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet,
    from: headers.from ?? "",
    to: headers.to ?? "",
    cc: headers.cc ?? "",
    subject: headers.subject ?? "(no subject)",
    date: headers.date ?? "",
    body,
    labelIds: data.labelIds ?? [],
    isUnread: (data.labelIds ?? []).includes("UNREAD"),
    attachments,
  })
}

async function execMessagesSend(
  token: string,
  fromEmail: string,
  p: Record<string, unknown>
): Promise<GmailToolResult> {
  const raw = buildRawEmail({
    from: fromEmail,
    to: p.to as string,
    subject: p.subject as string,
    body: p.body as string,
    cc: p.cc as string | undefined,
    bcc: p.bcc as string | undefined,
    replyTo: p.replyTo as string | undefined,
    inReplyTo: p.inReplyTo as string | undefined,
  })

  const reqBody: Record<string, unknown> = { raw }
  if (p.threadId) reqBody.threadId = p.threadId

  const data = await gmailJson(token, `/users/me/messages/send`, {
    method: "POST",
    body: JSON.stringify(reqBody),
  })

  return ok("gmail.messages.send", {
    id: data.id,
    threadId: data.threadId,
    labelIds: data.labelIds,
  })
}

async function execMessagesModify(
  token: string,
  p: Record<string, unknown>
): Promise<GmailToolResult> {
  const body: Record<string, unknown> = {}
  if (p.addLabelIds) body.addLabelIds = p.addLabelIds
  if (p.removeLabelIds) body.removeLabelIds = p.removeLabelIds

  const data = await gmailJson(
    token,
    `/users/me/messages/${p.id}/modify`,
    { method: "POST", body: JSON.stringify(body) }
  )

  return ok("gmail.messages.modify", {
    id: data.id,
    labelIds: data.labelIds,
    threadId: data.threadId,
  })
}

async function execMessagesTrash(
  token: string,
  p: Record<string, unknown>
): Promise<GmailToolResult> {
  const data = await gmailJson(
    token,
    `/users/me/messages/${p.id}/trash`,
    { method: "POST" }
  )

  return ok("gmail.messages.trash", {
    id: data.id,
    labelIds: data.labelIds,
  })
}

async function execMessagesUntrash(
  token: string,
  p: Record<string, unknown>
): Promise<GmailToolResult> {
  const data = await gmailJson(
    token,
    `/users/me/messages/${p.id}/untrash`,
    { method: "POST" }
  )

  return ok("gmail.messages.untrash", {
    id: data.id,
    labelIds: data.labelIds,
  })
}

// ─── Draft Operations ────────────────────────────────────────

async function execDraftsCreate(
  token: string,
  fromEmail: string,
  p: Record<string, unknown>
): Promise<GmailToolResult> {
  const raw = buildRawEmail({
    from: fromEmail,
    to: p.to as string,
    subject: p.subject as string,
    body: p.body as string,
    cc: p.cc as string | undefined,
  })

  const data = await gmailJson(token, `/users/me/drafts`, {
    method: "POST",
    body: JSON.stringify({
      message: { raw },
    }),
  })

  return ok("gmail.drafts.create", {
    id: data.id,
    messageId: data.message?.id,
    threadId: data.message?.threadId,
  })
}

async function execDraftsList(
  token: string,
  p: Record<string, unknown>
): Promise<GmailToolResult> {
  const maxResults = p.maxResults ?? 10
  const data = await gmailJson(
    token,
    `/users/me/drafts?maxResults=${maxResults}`
  )

  return ok("gmail.drafts.list", {
    drafts: (data.drafts ?? []).map((d: Record<string, unknown>) => ({
      id: d.id,
      messageId: (d.message as Record<string, unknown>)?.id,
    })),
    resultSizeEstimate: data.resultSizeEstimate ?? 0,
  })
}

// ─── Label Operations ────────────────────────────────────────

async function execLabelsList(token: string): Promise<GmailToolResult> {
  const data = await gmailJson(token, `/users/me/labels`)

  return ok("gmail.labels.list", {
    labels: (data.labels ?? []).map(
      (l: Record<string, unknown>) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        messagesTotal: l.messagesTotal,
        messagesUnread: l.messagesUnread,
      })
    ),
  })
}

// ─── Thread Operations ───────────────────────────────────────

async function execThreadsList(
  token: string,
  p: Record<string, unknown>
): Promise<GmailToolResult> {
  const params = new URLSearchParams()
  if (p.q) params.set("q", p.q as string)
  params.set("maxResults", String(p.maxResults ?? 10))
  if (p.pageToken) params.set("pageToken", p.pageToken as string)

  const data = await gmailJson(token, `/users/me/threads?${params}`)

  return ok("gmail.threads.list", {
    threads: (data.threads ?? []).map((t: Record<string, unknown>) => ({
      id: t.id,
      snippet: t.snippet,
      historyId: t.historyId,
    })),
    resultSizeEstimate: data.resultSizeEstimate ?? 0,
    nextPageToken: data.nextPageToken ?? null,
  })
}

async function execThreadsGet(
  token: string,
  p: Record<string, unknown>
): Promise<GmailToolResult> {
  const format = p.format ?? "full"
  const data = await gmailJson(
    token,
    `/users/me/threads/${p.id}?format=${format}`
  )

  const messages = (data.messages ?? []).map(
    (msg: Record<string, unknown>) => {
      const headers = parseHeaders(
        (msg.payload as Record<string, unknown>)?.headers as Array<{
          name: string
          value: string
        }> ?? []
      )
      return {
        id: msg.id,
        snippet: msg.snippet,
        from: headers.from ?? "",
        to: headers.to ?? "",
        subject: headers.subject ?? "",
        date: headers.date ?? "",
        body: extractBody(msg.payload as Record<string, unknown> ?? {}),
        labelIds: msg.labelIds ?? [],
      }
    }
  )

  return ok("gmail.threads.get", {
    id: data.id,
    historyId: data.historyId,
    messages,
  })
}
