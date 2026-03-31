/**
 * use-agent-chat.ts
 *
 * Chat hook backed by the Gateway WebSocket.
 * Uses chat.history to load messages, chat.send to send,
 * and streams real-time agent events (deltas, tool calls, lifecycle).
 */

import { useEffect, useRef, useState, useCallback } from "react"
import { useGatewayWs } from "./use-gateway-ws"

export type ToolCall = {
  id: string
  tool: string
  input?: unknown
  result?: unknown
  status: "running" | "done" | "error"
}

export type ChatMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  streaming?: boolean
  toolCalls?: ToolCall[]
  usage?: { inputTokens?: number; outputTokens?: number }
  ts?: string
}

let _msgCounter = 0
function nextId() { return `msg-${Date.now()}-${++_msgCounter}` }

export function useAgentChat(sessionKey: string | null) {
  const { connected, sendFrame, subscribe } = useGatewayWs()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pendingRequests = useRef<Map<string, (payload: unknown) => void>>(new Map())
  const streamingIdRef = useRef<string | null>(null)
  const streamingBufferRef = useRef("")
  const sessionKeyRef = useRef(sessionKey)
  sessionKeyRef.current = sessionKey

  // ─── RPC helper ────────────────────────────────────────────

  function rpc(id: string, method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve) => {
      pendingRequests.current.set(id, resolve)
      sendFrame({ type: "req", id, method, params })
    })
  }

  // ─── Load history ───────────────────────────────────────────

  const loadHistory = useCallback(async (key: string) => {
    if (!connected) return
    try {
      const id = `hist-${Date.now()}`
      const result = await rpc(id, "chat.history", { sessionKey: key, limit: 100 }) as {
        messages?: Array<{ role: string; text: string; ts?: string }>
        hasMore?: boolean
      }
      const msgs: ChatMessage[] = (result?.messages ?? []).map((m) => ({
        id: nextId(),
        role: m.role === "user" ? "user" : "assistant",
        text: m.text ?? "",
        ts: m.ts,
      }))
      setMessages(msgs)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, sendFrame])

  // Load history when connected + sessionKey available
  useEffect(() => {
    if (connected && sessionKey) {
      loadHistory(sessionKey)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, sessionKey])

  // ─── Subscribe to WS frames ─────────────────────────────────

  useEffect((): (() => void) => {
    const unsub = subscribe((frame: Record<string, unknown>) => {
      // RPC responses
      if (frame.type === "res") {
        const id = frame.id as string
        const resolve = pendingRequests.current.get(id)
        if (resolve) {
          pendingRequests.current.delete(id)
          resolve(frame.ok ? frame.payload : null)
        }
      }

      // Agent streaming events
      if (frame.type === "event" && frame.event === "agent") {
        const payload = frame.payload as {
          runId?: string
          stream?: string
          phase?: string
          delta?: string
          tool?: string
          input?: unknown
          result?: unknown
          status?: string
          summary?: { inputTokens?: number; outputTokens?: number }
        }
        const { stream, phase, delta, tool, runId } = payload

        if (stream === "lifecycle" && phase === "start") {
          setCurrentRunId(runId ?? null)
          setIsRunning(true)
          streamingBufferRef.current = ""
          setStreamingText("")
          // Create empty streaming bubble
          const id = nextId()
          streamingIdRef.current = id
          setMessages((prev) => [
            ...prev,
            { id, role: "assistant", text: "", streaming: true, toolCalls: [] },
          ])
        }

        if (stream === "assistant" && delta) {
          streamingBufferRef.current += delta
          const buf = streamingBufferRef.current
          setStreamingText(buf)
          // Update the streaming bubble text live
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current ? { ...m, text: buf } : m
            )
          )
        }

        if (stream === "tool" && tool) {
          if (phase === "start") {
            const toolId = `tool-${Date.now()}`
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingIdRef.current
                  ? {
                      ...m,
                      toolCalls: [
                        ...(m.toolCalls ?? []),
                        { id: toolId, tool, input: payload.input, status: "running" },
                      ],
                    }
                  : m
              )
            )
          }
          if (phase === "end") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === streamingIdRef.current
                  ? {
                      ...m,
                      toolCalls: (m.toolCalls ?? []).map((tc) =>
                        tc.tool === tool && tc.status === "running"
                          ? { ...tc, result: payload.result, status: "done" }
                          : tc
                      ),
                    }
                  : m
              )
            )
          }
        }

        if (stream === "lifecycle" && (phase === "end" || phase === "error")) {
          const finalText = streamingBufferRef.current
          const usage = payload.summary
          // Finalise the streaming bubble
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamingIdRef.current
                ? { ...m, text: finalText, streaming: false, usage }
                : m
            )
          )
          streamingIdRef.current = null
          streamingBufferRef.current = ""
          setStreamingText("")
          setIsRunning(false)
          setCurrentRunId(null)
        }
      }
    })
    return unsub
  }, [subscribe])

  // ─── Send message ────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      if (!sessionKeyRef.current || !connected) return
      setError(null)

      // Optimistic user bubble
      const userMsgId = nextId()
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", text, ts: new Date().toISOString() },
      ])

      try {
        const id = `send-${Date.now()}`
        await rpc(id, "chat.send", {
          sessionKey: sessionKeyRef.current,
          message: text,
          idempotencyKey: crypto.randomUUID(),
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== userMsgId))
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connected, sendFrame]
  )

  // ─── Abort run ───────────────────────────────────────────────

  const abortRun = useCallback(() => {
    if (!currentRunId) return
    sendFrame({ type: "req", id: `abort-${currentRunId}`, method: "agent.abort", params: { runId: currentRunId } })
  }, [currentRunId, sendFrame])

  return {
    messages,
    streamingText,
    isRunning,
    currentRunId,
    connected,
    error,
    sendMessage,
    abortRun,
    loadHistory,
  }
}
