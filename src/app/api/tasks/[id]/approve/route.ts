import { NextResponse } from "next/server"
import { updateTaskStatus } from "../../../lib/bridge"
import { requirePermission } from "../../../lib/auth"

// POST /api/tasks/:id/approve
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requirePermission(req, "mod")
  if (auth instanceof Response) return auth

  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const task = updateTaskStatus(id, "completed", auth.agentId, body.note)

  if (!task) {
    return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, data: task })
}
