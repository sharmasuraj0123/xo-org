/**
 * XO Mode configuration utility.
 * Works in proxy, server components, and client components.
 */

export type XOMode = "org" | "agent"

export function getMode(): XOMode {
  const mode = process.env.NEXT_PUBLIC_XO_MODE
  if (mode === "agent") return "agent"
  return "org"
}

export function isOrgMode(): boolean {
  return getMode() === "org"
}

export function isAgentMode(): boolean {
  return getMode() === "agent"
}

/** Fixed agent ID for standalone agent mode. */
export function getAgentId(): string {
  return process.env.NEXT_PUBLIC_XO_AGENT_ID || "aria"
}

/** Prefix for localStorage keys to isolate org/agent data. */
export function getStoragePrefix(): string {
  return getMode()
}

/** Build an org-prefixed path. */
export function orgPath(path: string): string {
  return `/org${path}`
}

/** Build an agent-prefixed path (no [id]). */
export function agentPath(path: string): string {
  return `/agent${path}`
}
