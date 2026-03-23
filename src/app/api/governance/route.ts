import { NextResponse } from "next/server"
import { getGovernance, updateGovernance } from "../lib/bridge"
import { requireAuth, requirePermission } from "../lib/auth"

// GET /api/governance
export async function GET(req: Request) {
  const auth = requireAuth(req)
  if (auth instanceof Response) return auth

  return NextResponse.json({ ok: true, data: getGovernance() })
}

// PATCH /api/governance — admin only
export async function PATCH(req: Request) {
  const auth = requirePermission(req, "admin")
  if (auth instanceof Response) return auth

  const body = await req.json()
  const updated = updateGovernance(body)

  return NextResponse.json({ ok: true, data: updated })
}
