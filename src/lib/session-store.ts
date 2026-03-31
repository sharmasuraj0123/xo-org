/**
 * Local storage-backed session message store.
 * Persists chat history per session ID so conversations survive page reloads.
 * Keys are namespaced by XO_MODE (org/agent) to isolate data between modes.
 */

import { getStoragePrefix } from "./mode"

export type StoredMessage = {
  id: string
  role: "user" | "assistant"
  text: string
  timestamp: number
}

export type SessionMeta = {
  sessionId: string
  title: string
  createdAt: number
  lastMessageAt: number
  messageCount: number
}

function storagePrefix() {
  return `xo-${getStoragePrefix()}-session-`
}

function metaKey() {
  return `xo-${getStoragePrefix()}-sessions-meta`
}

// ─── Message Operations ─────────────────────────────────────

export function getSessionMessages(sessionId: string): StoredMessage[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(`${storagePrefix()}${sessionId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveSessionMessages(sessionId: string, messages: StoredMessage[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${storagePrefix()}${sessionId}`, JSON.stringify(messages))
    // Update meta
    updateSessionMeta(sessionId, messages)
  } catch {
    // Storage full or unavailable
  }
}

export function appendSessionMessage(sessionId: string, message: StoredMessage): void {
  const messages = getSessionMessages(sessionId)
  messages.push(message)
  saveSessionMessages(sessionId, messages)
}

export function clearSessionMessages(sessionId: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(`${storagePrefix()}${sessionId}`)
    removeSessionMeta(sessionId)
  } catch {}
}

// ─── Session Meta Operations ────────────────────────────────

function getAllMeta(): SessionMeta[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(metaKey())
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveMeta(metas: SessionMeta[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(metaKey(), JSON.stringify(metas))
  } catch {}
}

function updateSessionMeta(sessionId: string, messages: StoredMessage[]): void {
  const metas = getAllMeta()
  const existing = metas.find((m) => m.sessionId === sessionId)
  const firstUserMsg = messages.find((m) => m.role === "user")
  const title = firstUserMsg
    ? firstUserMsg.text.slice(0, 50) + (firstUserMsg.text.length > 50 ? "…" : "")
    : "New session"

  if (existing) {
    existing.title = title
    existing.lastMessageAt = Date.now()
    existing.messageCount = messages.length
  } else {
    metas.push({
      sessionId,
      title,
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      messageCount: messages.length,
    })
  }

  saveMeta(metas)
}

function removeSessionMeta(sessionId: string): void {
  const metas = getAllMeta().filter((m) => m.sessionId !== sessionId)
  saveMeta(metas)
}

export function getSessionMeta(sessionId: string): SessionMeta | undefined {
  return getAllMeta().find((m) => m.sessionId === sessionId)
}

export function getAllSessionMetas(): SessionMeta[] {
  return getAllMeta().sort((a, b) => b.lastMessageAt - a.lastMessageAt)
}

export function ensureSessionMeta(sessionId: string): void {
  const metas = getAllMeta()
  if (!metas.find((m) => m.sessionId === sessionId)) {
    metas.push({
      sessionId,
      title: "New session",
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      messageCount: 0,
    })
    saveMeta(metas)
  }
}
