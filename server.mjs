/**
 * Custom Next.js server with WebSocket proxy.
 *
 * Proxies WS connections at /api/gateway/ws → ws://127.0.0.1:18789
 * so the browser can reach the OpenClaw Gateway through the same
 * origin as the Next.js app (no CORS/mixed-content issues).
 *
 * Usage: node server.mjs   (replaces `next dev`)
 */

import { createServer } from "node:http"
import { parse } from "node:url"
import next from "next"
import { WebSocketServer, WebSocket } from "ws"

const port = parseInt(process.env.PORT || "3006", 10)
const dev = process.env.NODE_ENV !== "production"
const GATEWAY_WS = process.env.OPENCLAW_GATEWAY_WS_URL || "ws://127.0.0.1:18789"

const app = next({ dev, port })
const handle = app.getRequestHandler()

await app.prepare()

const server = createServer((req, res) => {
  const parsedUrl = parse(req.url, true)
  handle(req, res, parsedUrl)
})

// WebSocket proxy — only for /api/gateway/ws
const wss = new WebSocketServer({ noServer: true })

server.on("upgrade", (req, socket, head) => {
  const { pathname } = parse(req.url)

  if (pathname !== "/api/gateway/ws") {
    socket.destroy()
    return
  }

  wss.handleUpgrade(req, socket, head, (clientWs) => {
    // Connect to the Gateway, forwarding the Origin header
    const gwWs = new WebSocket(GATEWAY_WS, {
      headers: {
        // Forward the request origin — Gateway uses it for controlUi auth
        origin: req.headers.origin || "http://localhost:" + port,
      },
    })

    // Pipe client ↔ Gateway
    clientWs.on("message", (data, isBinary) => {
      if (gwWs.readyState === WebSocket.OPEN) gwWs.send(data, { binary: isBinary })
    })
    gwWs.on("message", (data, isBinary) => {
      if (clientWs.readyState === WebSocket.OPEN) clientWs.send(data, { binary: isBinary })
    })

    clientWs.on("close", () => { try { gwWs.close(1000) } catch {} })
    gwWs.on("close", () => { try { clientWs.close(1000) } catch {} })

    clientWs.on("error", () => gwWs.close())
    gwWs.on("error", () => clientWs.close())
  })
})

server.listen(port, () => {
  console.log(`▲ Next.js + Gateway WS proxy ready on http://localhost:${port}`)
  console.log(`  WS proxy: ws://localhost:${port}/api/gateway/ws → ${GATEWAY_WS}`)
})
