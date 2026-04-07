/**
 * Slack tool operations for agents.
 *
 * Every Slack operation an agent can perform. Uses slackFetch()
 * for authenticated requests. Agents call these via POST /api/slack/tools.
 */

import { slackFetch } from "./slack"
import { getBotToken, getUserToken } from "./slack-store"
import type { SlackToolName, SlackToolResult, SlackToolDefinition } from "./types"

// ─── Tool Registry ───────────────────────────────────────────

export const SLACK_TOOLS: SlackToolDefinition[] = [
  {
    name: "slack.channels.list",
    description: "List channels in the workspace (public, private, DMs, group DMs)",
    params: {
      types: { type: "string", required: false, description: "Comma-separated types: public_channel, private_channel, im, mpim (default: public_channel)" },
      limit: { type: "number", required: false, description: "Max results (default 100, max 1000)" },
      cursor: { type: "string", required: false, description: "Pagination cursor" },
    },
  },
  {
    name: "slack.channels.history",
    description: "Read message history from a channel",
    params: {
      channel: { type: "string", required: true, description: "Channel ID" },
      limit: { type: "number", required: false, description: "Max messages (default 20, max 1000)" },
      cursor: { type: "string", required: false, description: "Pagination cursor" },
      oldest: { type: "string", required: false, description: "Start of time range (Unix ts)" },
      latest: { type: "string", required: false, description: "End of time range (Unix ts)" },
    },
  },
  {
    name: "slack.channels.join",
    description: "Join a public channel",
    params: {
      channel: { type: "string", required: true, description: "Channel ID to join" },
    },
  },
  {
    name: "slack.threads.replies",
    description: "Read all replies in a thread",
    params: {
      channel: { type: "string", required: true, description: "Channel ID" },
      ts: { type: "string", required: true, description: "Thread parent message timestamp" },
      limit: { type: "number", required: false, description: "Max replies (default 50)" },
    },
  },
  {
    name: "slack.messages.send",
    description: "Send a message to a channel or reply in a thread",
    params: {
      channel: { type: "string", required: true, description: "Channel ID" },
      text: { type: "string", required: true, description: "Message text (supports Slack markdown)" },
      thread_ts: { type: "string", required: false, description: "Thread timestamp to reply to (omit for new message)" },
      blocks: { type: "array", required: false, description: "Block Kit blocks for rich formatting" },
    },
  },
  {
    name: "slack.messages.react",
    description: "Add an emoji reaction to a message",
    params: {
      channel: { type: "string", required: true, description: "Channel ID" },
      timestamp: { type: "string", required: true, description: "Message timestamp" },
      name: { type: "string", required: true, description: "Emoji name without colons (e.g. 'thumbsup')" },
    },
  },
  {
    name: "slack.users.list",
    description: "List all workspace members",
    params: {
      limit: { type: "number", required: false, description: "Max results (default 100)" },
      cursor: { type: "string", required: false, description: "Pagination cursor" },
    },
  },
  {
    name: "slack.users.info",
    description: "Get detailed info about a specific user",
    params: {
      user: { type: "string", required: true, description: "User ID" },
    },
  },
  {
    name: "slack.search.messages",
    description: "Search messages across the workspace (requires user token with search:read scope)",
    params: {
      query: { type: "string", required: true, description: "Search query (supports from:@user, in:#channel, has:link, etc.)" },
      count: { type: "number", required: false, description: "Max results (default 20)" },
      sort: { type: "string", required: false, description: "Sort by: score or timestamp (default: score)" },
    },
  },
  {
    name: "slack.files.upload",
    description: "Upload a file and share it in a channel",
    params: {
      channel: { type: "string", required: true, description: "Channel ID to share the file in" },
      content: { type: "string", required: true, description: "File content (text)" },
      filename: { type: "string", required: true, description: "Filename with extension" },
      title: { type: "string", required: false, description: "Display title for the file" },
    },
  },
]

// ─── Tool Executor ───────────────────────────────────────────

export async function executeSlackTool(
  tool: SlackToolName,
  params: Record<string, unknown>
): Promise<SlackToolResult> {
  const auth = await getBotToken()
  if (!auth) {
    return { tool, ok: false, error: "No active Slack connection" }
  }

  try {
    switch (tool) {
      case "slack.channels.list":
        return await execChannelsList(auth.token, params)
      case "slack.channels.history":
        return await execChannelsHistory(auth.token, params)
      case "slack.channels.join":
        return await execChannelsJoin(auth.token, params)
      case "slack.threads.replies":
        return await execThreadsReplies(auth.token, params)
      case "slack.messages.send":
        return await execMessagesSend(auth.token, params)
      case "slack.messages.react":
        return await execMessagesReact(auth.token, params)
      case "slack.users.list":
        return await execUsersList(auth.token, params)
      case "slack.users.info":
        return await execUsersInfo(auth.token, params)
      case "slack.search.messages":
        return await execSearchMessages(params)
      case "slack.files.upload":
        return await execFilesUpload(auth.token, params)
      default:
        return { tool, ok: false, error: `Unknown tool: ${tool}` }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { tool, ok: false, error: message }
  }
}

function ok(tool: SlackToolName, data: unknown): SlackToolResult {
  return { tool, ok: true, data }
}

// ─── Channel Operations ─────────────────────────────────────

async function execChannelsList(
  token: string,
  p: Record<string, unknown>
): Promise<SlackToolResult> {
  const params: Record<string, string> = {
    types: (p.types as string) ?? "public_channel",
    limit: String(p.limit ?? 100),
    exclude_archived: "true",
  }
  if (p.cursor) params.cursor = p.cursor as string

  const data = await slackFetch(token, "conversations.list", params)
  const channels = (data.channels as Array<Record<string, unknown>>) ?? []

  return ok("slack.channels.list", {
    channels: channels.map((c) => ({
      id: c.id,
      name: c.name,
      is_private: c.is_private,
      is_member: c.is_member,
      topic: (c.topic as Record<string, unknown>)?.value ?? "",
      purpose: (c.purpose as Record<string, unknown>)?.value ?? "",
      num_members: c.num_members,
    })),
    nextCursor: (data.response_metadata as Record<string, unknown>)?.next_cursor ?? null,
  })
}

async function execChannelsHistory(
  token: string,
  p: Record<string, unknown>
): Promise<SlackToolResult> {
  const params: Record<string, string> = {
    channel: p.channel as string,
    limit: String(p.limit ?? 20),
  }
  if (p.cursor) params.cursor = p.cursor as string
  if (p.oldest) params.oldest = p.oldest as string
  if (p.latest) params.latest = p.latest as string

  const data = await slackFetch(token, "conversations.history", params)
  const messages = (data.messages as Array<Record<string, unknown>>) ?? []

  return ok("slack.channels.history", {
    messages: messages.map((m) => ({
      ts: m.ts,
      user: m.user,
      text: m.text,
      type: m.type,
      thread_ts: m.thread_ts,
      reply_count: m.reply_count,
      reactions: m.reactions,
    })),
    has_more: data.has_more,
    nextCursor: (data.response_metadata as Record<string, unknown>)?.next_cursor ?? null,
  })
}

async function execChannelsJoin(
  token: string,
  p: Record<string, unknown>
): Promise<SlackToolResult> {
  const data = await slackFetch(token, "conversations.join", undefined, {
    channel: p.channel,
  })
  const channel = data.channel as Record<string, unknown>

  return ok("slack.channels.join", {
    id: channel.id,
    name: channel.name,
  })
}

// ─── Thread Operations ───────────────────────────────────────

async function execThreadsReplies(
  token: string,
  p: Record<string, unknown>
): Promise<SlackToolResult> {
  const params: Record<string, string> = {
    channel: p.channel as string,
    ts: p.ts as string,
    limit: String(p.limit ?? 50),
  }

  const data = await slackFetch(token, "conversations.replies", params)
  const messages = (data.messages as Array<Record<string, unknown>>) ?? []

  return ok("slack.threads.replies", {
    messages: messages.map((m) => ({
      ts: m.ts,
      user: m.user,
      text: m.text,
      thread_ts: m.thread_ts,
      reactions: m.reactions,
    })),
    has_more: data.has_more,
  })
}

// ─── Message Operations ──────────────────────────────────────

async function execMessagesSend(
  token: string,
  p: Record<string, unknown>
): Promise<SlackToolResult> {
  const body: Record<string, unknown> = {
    channel: p.channel,
    text: p.text,
  }
  if (p.thread_ts) body.thread_ts = p.thread_ts
  if (p.blocks) body.blocks = p.blocks

  const data = await slackFetch(token, "chat.postMessage", undefined, body)

  return ok("slack.messages.send", {
    channel: data.channel,
    ts: data.ts,
    message: {
      text: (data.message as Record<string, unknown>)?.text,
      ts: (data.message as Record<string, unknown>)?.ts,
    },
  })
}

async function execMessagesReact(
  token: string,
  p: Record<string, unknown>
): Promise<SlackToolResult> {
  await slackFetch(token, "reactions.add", undefined, {
    channel: p.channel,
    timestamp: p.timestamp,
    name: p.name,
  })

  return ok("slack.messages.react", { added: true })
}

// ─── User Operations ─────────────────────────────────────────

async function execUsersList(
  token: string,
  p: Record<string, unknown>
): Promise<SlackToolResult> {
  const params: Record<string, string> = {
    limit: String(p.limit ?? 100),
  }
  if (p.cursor) params.cursor = p.cursor as string

  const data = await slackFetch(token, "users.list", params)
  const members = (data.members as Array<Record<string, unknown>>) ?? []

  return ok("slack.users.list", {
    users: members
      .filter((m) => !(m.is_bot || m.deleted))
      .map((m) => {
        const profile = m.profile as Record<string, unknown>
        return {
          id: m.id,
          name: m.name,
          real_name: m.real_name,
          display_name: profile?.display_name ?? "",
          email: profile?.email ?? "",
          status_text: profile?.status_text ?? "",
          status_emoji: profile?.status_emoji ?? "",
          is_admin: m.is_admin,
          avatar: profile?.image_72 ?? "",
        }
      }),
    nextCursor: (data.response_metadata as Record<string, unknown>)?.next_cursor ?? null,
  })
}

async function execUsersInfo(
  token: string,
  p: Record<string, unknown>
): Promise<SlackToolResult> {
  const data = await slackFetch(token, "users.info", {
    user: p.user as string,
  })
  const user = data.user as Record<string, unknown>
  const profile = user.profile as Record<string, unknown>

  return ok("slack.users.info", {
    id: user.id,
    name: user.name,
    real_name: user.real_name,
    display_name: profile?.display_name ?? "",
    email: profile?.email ?? "",
    title: profile?.title ?? "",
    status_text: profile?.status_text ?? "",
    is_admin: user.is_admin,
    is_bot: user.is_bot,
    tz: user.tz,
    avatar: profile?.image_192 ?? "",
  })
}

// ─── Search ──────────────────────────────────────────────────

async function execSearchMessages(
  p: Record<string, unknown>
): Promise<SlackToolResult> {
  const userToken = await getUserToken()
  if (!userToken) {
    return {
      tool: "slack.search.messages",
      ok: false,
      error: "Search requires a user token with search:read scope. Reconnect Slack with user scope to enable.",
    }
  }

  const params: Record<string, string> = {
    query: p.query as string,
    count: String(p.count ?? 20),
    sort: (p.sort as string) ?? "score",
  }

  const data = await slackFetch(userToken, "search.messages", params)
  const messages = data.messages as Record<string, unknown>
  const matches = (messages?.matches as Array<Record<string, unknown>>) ?? []

  return ok("slack.search.messages", {
    total: (messages as Record<string, unknown>)?.total ?? 0,
    matches: matches.map((m) => ({
      ts: m.ts,
      text: m.text,
      user: (m.user as string) ?? (m.username as string),
      channel: {
        id: (m.channel as Record<string, unknown>)?.id,
        name: (m.channel as Record<string, unknown>)?.name,
      },
      permalink: m.permalink,
    })),
  })
}

// ─── File Upload ─────────────────────────────────────────────

async function execFilesUpload(
  token: string,
  p: Record<string, unknown>
): Promise<SlackToolResult> {
  const content = p.content as string
  const filename = p.filename as string
  const contentBytes = new TextEncoder().encode(content)

  // Step 1: Get upload URL
  const urlData = await slackFetch(token, "files.getUploadURLExternal", {
    filename,
    length: String(contentBytes.length),
  })

  const uploadUrl = urlData.upload_url as string
  const fileId = urlData.file_id as string

  // Step 2: Upload the file
  await fetch(uploadUrl, {
    method: "POST",
    body: contentBytes,
  })

  // Step 3: Complete the upload and share in channel
  await slackFetch(token, "files.completeUploadExternal", undefined, {
    files: [{ id: fileId, title: p.title ?? filename }],
    channel_id: p.channel,
  })

  return ok("slack.files.upload", {
    file_id: fileId,
    filename,
    channel: p.channel,
  })
}
