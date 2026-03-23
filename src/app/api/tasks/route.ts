import { NextResponse } from "next/server"
import { createTask, listTasks } from "../lib/bridge"
import { requireAuth } from "../lib/auth"
import type { TaskStatus } from "../lib/types"

// GET /api/tasks?status=in_progress&assignee=nova
export async function GET(req: Request) {
  const auth = requireAuth(req)
  if (auth instanceof Response) return auth

  const url = new URL(req.url)
  const status = url.searchParams.get("status") as TaskStatus | null
  const assignee = url.searchParams.get("assignee")

  const tasks = listTasks({
    status: status ?? undefined,
    assignee: assignee ?? undefined,
  })

  return NextResponse.json({ ok: true, data: tasks })
}

// POST /api/tasks — create task
export async function POST(req: Request) {
  const auth = requireAuth(req)
  if (auth instanceof Response) return auth

  const body = await req.json()
  const { title, description, channel, assignTo } = body

  if (!title || !channel) {
    return NextResponse.json(
      { ok: false, error: "title and channel are required" },
      { status: 400 }
    )
  }

  const task = createTask(title, description ?? "", auth.agentId, channel, assignTo)
  return NextResponse.json({ ok: true, data: task }, { status: 201 })
}
