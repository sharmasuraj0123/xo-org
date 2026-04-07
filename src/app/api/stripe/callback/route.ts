import { NextResponse } from "next/server"
import { exchangeStripeCode, stripeFetch, isStripeConfigured } from "../../lib/stripe"
import { saveConnection } from "../../lib/stripe-store"

export async function GET(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: false, error: "Stripe not configured" }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const stateParam = searchParams.get("state")
  const error = searchParams.get("error")

  let returnTo = "/org/connections"
  if (stateParam) {
    try {
      const state = JSON.parse(Buffer.from(stateParam, "base64url").toString())
      if (state.returnTo) returnTo = state.returnTo
    } catch { /* ignore */ }
  }

  if (error) {
    const url = new URL(returnTo, req.url)
    url.searchParams.set("stripe", "denied")
    return NextResponse.redirect(url)
  }

  if (!code) {
    return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 })
  }

  try {
    const tokens = await exchangeStripeCode(code)

    // Fetch account details
    let businessName = ""
    let email = ""
    try {
      const account = await stripeFetch(tokens.stripe_user_id, `/accounts/${tokens.stripe_user_id}`)
      businessName = (account.business_profile as Record<string, unknown>)?.name as string
        ?? account.settings && ((account.settings as Record<string, unknown>).dashboard as Record<string, unknown>)?.display_name as string
        ?? ""
      email = (account.email as string) ?? ""
    } catch { /* ignore — account info is optional */ }

    await saveConnection(
      tokens.stripe_user_id,
      businessName,
      email,
      tokens.access_token,
      tokens.refresh_token ?? null,
      tokens.scope as "read_write" | "read_only",
      tokens.livemode
    )

    const url = new URL(returnTo, req.url)
    url.searchParams.set("stripe", "connected")
    return NextResponse.redirect(url)
  } catch (err) {
    console.error("Stripe callback error:", err)
    const url = new URL(returnTo, req.url)
    url.searchParams.set("stripe", "error")
    return NextResponse.redirect(url)
  }
}
