import { NextResponse } from "next/server"
import { getChannelHistory } from "../../../lib/bridge"
import { requireAuth } from "../../../lib/auth"

// GET /api/channels/:name/history — channel message history
export async function GET(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const auth = requireAuth(req)
  if (auth instanceof Response) return auth

  const { name } = await params
  const url = new URL(req.url)
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10)

  const messages = getChannelHistory(name, limit)
  return NextResponse.json({ ok: true, data: messages })
}
