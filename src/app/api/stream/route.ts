import { authenticate } from "../lib/auth"
import { readMessages, subscribe, getAgent } from "../lib/bridge"

// GET /api/stream — SSE event stream for an agent
export async function GET(req: Request) {
  const agentId = authenticate(req)

  // For dashboard/browser clients, allow unauthenticated stream
  const url = new URL(req.url)
  const clientId = agentId ?? url.searchParams.get("client") ?? "browser"

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Helper to send SSE-formatted events
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      // Send initial catch-up events
      if (agentId) {
        const agent = getAgent(agentId)
        const cursor = agent?.cursor ?? 0
        const { messages } = readMessages(cursor, agentId)
        for (const msg of messages) {
          send("message", msg)
        }
      }

      // Subscribe to new events
      const unsubscribe = subscribe(clientId, (msg) => {
        const eventType = msg.type === "task" ? "task" : "message"
        send(eventType, msg)
      })

      // Keep-alive every 15 seconds
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`))
        } catch {
          clearInterval(keepalive)
        }
      }, 15000)

      // Send initial heartbeat
      send("heartbeat", { serverTime: Date.now(), connected: true })

      // Cleanup on disconnect
      req.signal.addEventListener("abort", () => {
        unsubscribe()
        clearInterval(keepalive)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
