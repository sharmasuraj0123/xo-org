import { NextResponse } from "next/server"
import { buildVercelOAuthUrl, isVercelConfigured } from "../../lib/vercel"

export async function GET(req: Request) {
  if (!isVercelConfigured()) {
    return NextResponse.json({ ok: false, error: "Vercel not configured" }, { status: 503 })
  }
  const { searchParams } = new URL(req.url)
  const returnTo = searchParams.get("return_to") ?? "/org/connections"
  const state = Buffer.from(
    JSON.stringify({ returnTo, nonce: crypto.randomUUID() })
  ).toString("base64url")
  return NextResponse.redirect(buildVercelOAuthUrl(state))
}
