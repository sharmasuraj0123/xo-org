/**
 * GitHub installation persistence.
 *
 * Stores installation data in-memory (mirrors bridge.ts pattern).
 * In production, replace with a database or encrypted file store.
 */

import type { GitHubInstallation, GitHubConnectionStatus } from "./types"
import { invalidateToken } from "./github"

// ─── In-Memory Store ─────────────────────────────────────────

const installations = new Map<number, GitHubInstallation>()

// ─── Operations ──────────────────────────────────────────────

export function saveInstallation(
  installationId: number,
  githubUsername: string,
  avatarUrl: string | null,
  repoScope: "all" | string[]
): GitHubInstallation {
  const now = Date.now()
  const existing = installations.get(installationId)

  const installation: GitHubInstallation = {
    installationId,
    githubUsername,
    avatarUrl,
    repoScope,
    status: "connected",
    connectedAt: existing?.connectedAt ?? now,
    updatedAt: now,
  }

  installations.set(installationId, installation)
  return installation
}

export function getInstallation(
  installationId: number
): GitHubInstallation | undefined {
  return installations.get(installationId)
}

/**
 * Get the first active installation (org-wide connector model —
 * one GitHub connection shared by all agents).
 */
export function getActiveInstallation(): GitHubInstallation | undefined {
  for (const inst of installations.values()) {
    if (inst.status === "connected") return inst
  }
  return undefined
}

export function listInstallations(): GitHubInstallation[] {
  return Array.from(installations.values())
}

export function updateInstallationStatus(
  installationId: number,
  status: GitHubConnectionStatus
): GitHubInstallation | undefined {
  const inst = installations.get(installationId)
  if (!inst) return undefined

  inst.status = status
  inst.updatedAt = Date.now()

  if (status === "disconnected" || status === "expired") {
    invalidateToken(installationId)
  }

  return inst
}

export function updateInstallationRepos(
  installationId: number,
  repoScope: "all" | string[]
): GitHubInstallation | undefined {
  const inst = installations.get(installationId)
  if (!inst) return undefined

  inst.repoScope = repoScope
  inst.updatedAt = Date.now()
  return inst
}

export function removeInstallation(installationId: number): boolean {
  invalidateToken(installationId)
  return installations.delete(installationId)
}
