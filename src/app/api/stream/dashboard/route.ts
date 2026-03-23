import { getStats, listAgents } from "../../lib/bridge"

// GET /api/stream/dashboard — SSE stream for dashboard stats
export async function GET(req: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const sendStats = () => {
        try {
          const stats = getStats()
          const agents = listAgents().map(({ cursor, lastPulse, connectedAt, ...rest }) => rest)
          controller.enqueue(
            encoder.encode(`event: stats\ndata: ${JSON.stringify(stats)}\n\n`)
          )
          controller.enqueue(
            encoder.encode(`event: agents\ndata: ${JSON.stringify(agents)}\n\n`)
          )
        } catch {
          clearInterval(interval)
        }
      }

      // Send initial stats
      sendStats()

      // Then every 5 seconds
      const interval = setInterval(sendStats, 5000)

      // Keep-alive
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`))
        } catch {
          clearInterval(keepalive)
        }
      }, 15000)

      req.signal.addEventListener("abort", () => {
        clearInterval(interval)
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
