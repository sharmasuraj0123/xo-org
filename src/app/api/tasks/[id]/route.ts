import { NextResponse } from "next/server"
import { getTask, updateTaskStatus } from "../../lib/bridge"
import { requireAuth } from "../../lib/auth"
import type { TaskStatus } from "../../lib/types"

// GET /api/tasks/:id
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth instanceof Response) return auth

  const { id } = await params
  const task = getTask(id)

  if (!task) {
    return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, data: task })
}

// PATCH /api/tasks/:id — update task status
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(req)
  if (auth instanceof Response) return auth

  const { id } = await params
  const body = await req.json()
  const { status, note } = body as { status: TaskStatus; note?: string }

  if (!status) {
    return NextResponse.json({ ok: false, error: "status is required" }, { status: 400 })
  }

  const task = updateTaskStatus(id, status, auth.agentId, note)

  if (!task) {
    return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, data: task })
}
