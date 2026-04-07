import { NextResponse } from "next/server"
import { verifySlackSignature, slackFetch } from "../../lib/slack"
import { getBotToken } from "../../lib/slack-store"
import { appendMessage, notifySubscribers } from "../../lib/bridge"

/**
 * POST /api/slack/events
 *
 * Receives events from Slack's Events API.
 * Handles: url_verification, app_mention, message.im
 *
 * IMPORTANT: Must respond within 3 seconds. Events are processed
 * after sending the 200 response.
 */

// Deduplication — track processed event IDs
const processedEvents = new Set<string>()
const MAX_PROCESSED = 1000

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get("x-slack-signature")
  const timestamp = req.headers.get("x-slack-request-timestamp")

  // Verify signature
  const valid = await verifySlackSignature(body, signature, timestamp)
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 401 }
    )
  }

  const payload = JSON.parse(body)

  // URL verification challenge (one-time during setup)
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge })
  }

  // Event callback
  if (payload.type === "event_callback") {
    const event = payload.event
    const eventId = payload.event_id

    // Deduplicate
    if (processedEvents.has(eventId)) {
      return NextResponse.json({ ok: true })
    }
    processedEvents.add(eventId)
    if (processedEvents.size > MAX_PROCESSED) {
      const first = processedEvents.values().next().value
      if (first) processedEvents.delete(first)
    }

    // Respond immediately to Slack (within 3 seconds)
    // Process the event asynchronously
    processEvent(event, payload.team_id).catch((err) =>
      console.error("Slack event processing error:", err)
    )

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: true })
}

// ─── Event Processing ────────────────────────────────────────

async function processEvent(
  event: Record<string, unknown>,
  teamId: string
): Promise<void> {
  const eventType = event.type as string

  // Ignore bot's own messages to prevent loops
  const auth = await getBotToken()
  if (auth && event.bot_id) return
  if (auth && event.user === auth.botUserId) return

  switch (eventType) {
    case "app_mention":
      await handleAppMention(event)
      break
    case "message":
      // Only handle DMs (channel_type: "im")
      if (event.channel_type === "im" && !event.subtype) {
        await handleDirectMessage(event)
      }
      break
  }
}

async function handleAppMention(
  event: Record<string, unknown>
): Promise<void> {
  const channel = event.channel as string
  const user = event.user as string
  const text = event.text as string
  const threadTs = (event.thread_ts ?? event.ts) as string

  // Route to bridge as a message from Slack
  const msg = appendMessage("slack", "#general", "ask", {
    text: `Slack @mention from <@${user}>: ${text}`,
    metadata: {
      slackEvent: "app_mention",
      channel,
      user,
      threadTs,
      text,
    },
  })
  notifySubscribers(msg)

  // Auto-reply acknowledging the mention
  const auth = await getBotToken()
  if (auth) {
    await slackFetch(auth.token, "chat.postMessage", undefined, {
      channel,
      thread_ts: threadTs,
      text: `Got it! I'm processing your request...`,
    })
  }
}

async function handleDirectMessage(
  event: Record<string, unknown>
): Promise<void> {
  const channel = event.channel as string
  const user = event.user as string
  const text = event.text as string

  // Route to bridge
  const msg = appendMessage("slack", "#general", "ask", {
    text: `Slack DM from <@${user}>: ${text}`,
    metadata: {
      slackEvent: "message.im",
      channel,
      user,
      text,
    },
  })
  notifySubscribers(msg)
}
