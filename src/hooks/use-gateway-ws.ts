/**
 * use-gateway-ws.ts
 *
 * Singleton WebSocket hook for the OpenClaw Gateway.
 * Manages connection lifecycle, challenge/connect handshake, and reconnection.
 * One WebSocket per page — all callers share the same connection.
 */

import { useEffect, useRef, useState, useCallback } from "react"

type Frame = Record<string, unknown>
type MessageHandler = (frame: Frame) => void

// ─── Singleton state ──────────────────────────────────────────

let _ws: WebSocket | null = null
let _connected = false
let _token: string | null = null
let _wsUrl: string | null = null
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null
let _reconnectDelay = 1000
const _handlers = new Set<MessageHandler>()
const _stateListeners = new Set<(connected: boolean) => void>()

function notifyState(connected: boolean) {
  _connected = connected
  _stateListeners.forEach((fn) => fn(connected))
}

function sendFrame(frame: Frame) {
  if (_ws?.readyState === WebSocket.OPEN) {
    _ws.send(JSON.stringify(frame))
  }
}

function connect() {
  if (!_wsUrl || !_token) return
  if (_ws && (_ws.readyState === WebSocket.CONNECTING || _ws.readyState === WebSocket.OPEN)) return

  const ws = new WebSocket(_wsUrl)
  _ws = ws

  ws.onopen = () => {
    console.log("[gateway-ws] socket open, waiting for challenge...")
  }

  ws.onmessage = (ev) => {
    let frame: Frame
    try { frame = JSON.parse(ev.data) } catch { return }

    // Handle challenge → send connect
    if (frame.type === "event" && frame.event === "connect.challenge") {
      const payload = frame.payload as { nonce: string; ts: number }
      sendFrame({
        type: "req",
        id: "conn-1",
        method: "connect",
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          role: "operator",
          scopes: ["operator.read", "operator.write"],
          auth: { token: _token },
          // client.id must be a known Gateway client ID; "openclaw-control-ui" with mode "ui"
          // is the standard operator dashboard identity
          client: { id: "openclaw-control-ui", version: "1.0.0", platform: "browser", mode: "ui" },
          device: {
            id: "xo-org-dashboard",
            // publicKey and signature must be non-empty; pass a single-byte placeholder
            // since token auth is the primary auth method here
            publicKey: "A",
            signature: "A",
            nonce: payload.nonce,
            signedAt: payload.ts ?? Date.now(),
          },
        },
      })
      return
    }

    // Handle hello-ok → we're connected
    if (frame.type === "res" && frame.id === "conn-1") {
      if ((frame as { ok?: boolean }).ok) {
        _reconnectDelay = 1000 // reset backoff on successful connect
        notifyState(true)
      }
    }

    // Broadcast all frames to subscribers
    _handlers.forEach((fn) => fn(frame))
  }

  ws.onclose = (ev) => {
    console.log("[gateway-ws] closed — code:", ev.code, "reason:", ev.reason || "(none)")
    notifyState(false)
    _ws = null
    // Exponential backoff reconnect
    _reconnectTimer = setTimeout(() => {
      _reconnectDelay = Math.min(_reconnectDelay * 2, 30000)
      connect()
    }, _reconnectDelay)
  }

  ws.onerror = (e) => {
    console.error("[gateway-ws] WebSocket error — check browser console for details", e)
    ws.close()
  }
}

async function bootstrap() {
  if (_wsUrl && _token) { connect(); return }
  try {
    const res = await fetch("/api/openclaw/ws-token")
    if (!res.ok) throw new Error("Failed to fetch WS token")
    const data = await res.json() as { url: string; token: string }

    _wsUrl = data.url
    _token = data.token
    console.log("[gateway-ws] bootstrapped, connecting to:", _wsUrl)
    connect()
  } catch (e) {
    // Retry after delay
    setTimeout(bootstrap, 3000)
  }
}

// ─── React hook ───────────────────────────────────────────────

export function useGatewayWs() {
  const [connected, setConnected] = useState(_connected)

  useEffect(() => {
    // Subscribe to state changes
    const onState = (s: boolean) => setConnected(s)
    _stateListeners.add(onState)
    setConnected(_connected)

    // Bootstrap once
    if (typeof window !== "undefined" && !_wsUrl) {
      bootstrap()
    } else if (_wsUrl && !_ws) {
      connect()
    }

    return () => {
      _stateListeners.delete(onState)
    }
  }, [])

  const subscribe = useCallback((handler: MessageHandler) => {
    _handlers.add(handler)
    return () => _handlers.delete(handler)
  }, [])

  return { connected, sendFrame, subscribe }
}
