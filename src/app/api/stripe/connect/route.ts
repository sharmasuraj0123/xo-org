import { NextResponse } from "next/server"
import { buildStripeOAuthUrl, isStripeConfigured } from "../../lib/stripe"

export async function GET(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: false, error: "Stripe not configured" }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const returnTo = searchParams.get("return_to") ?? "/org/connections"
  const scope = (searchParams.get("scope") as "read_write" | "read_only") ?? "read_write"

  const state = Buffer.from(
    JSON.stringify({ returnTo, nonce: crypto.randomUUID() })
  ).toString("base64url")

  return NextResponse.redirect(buildStripeOAuthUrl(state, scope))
}
