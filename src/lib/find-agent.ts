import fs from "node:fs"
import path from "node:path"
import { AGENTS, type Agent } from "@/lib/mock-data"

const BRIDGE_PATH = path.join(process.cwd(), ".data", "bridge-agents.json")

/**
 * Find an agent by ID — checks static mock data first,
 * then falls back to persisted bridge agents on disk.
 */
export function findAgent(id: string): Agent | undefined {
  // Check static mock data first
  const mock = AGENTS.find((a) => a.id === id)
  if (mock) return mock

  // Fall back to persisted bridge agents
  try {
    if (fs.existsSync(BRIDGE_PATH)) {
      const data = JSON.parse(fs.readFileSync(BRIDGE_PATH, "utf-8")) as Array<Record<string, unknown>>
      const found = data.find((a) => a.id === id)
      if (found) {
        return {
          id: found.id as string,
          name: found.name as string,
          role: (found.role as Agent["role"]) ?? "Engineering",
          status: (found.status as Agent["status"]) ?? "active",
          model: (found.model as string) ?? "unknown",
          lastActive: (found.lastActive as string) ?? "just now",
          currentTask: (found.currentTask as string | null) ?? null,
          channels: (found.channels as string[]) ?? ["general"],
          tasksCompleted: (found.tasksCompleted as number) ?? 0,
        }
      }
    }
  } catch { /* ignore read errors */ }

  return undefined
}
