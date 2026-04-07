import { NextResponse } from "next/server"
import { exchangeSlackCode, isSlackConfigured } from "../../lib/slack"
import { saveConnection } from "../../lib/slack-store"

/**
 * GET /api/slack/callback
 *
 * Handles the redirect from Slack after OAuth consent.
 */
export async function GET(req: Request) {
  if (!isSlackConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Slack connector is not configured" },
      { status: 503 }
    )
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
    url.searchParams.set("slack", "denied")
    return NextResponse.redirect(url)
  }

  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Missing authorization code" },
      { status: 400 }
    )
  }

  try {
    const data = await exchangeSlackCode(code)

    await saveConnection(
      data.team.id,
      data.team.name,
      data.bot_user_id,
      data.authed_user.id,
      data.access_token,
      data.authed_user.access_token ?? null
    )

    const url = new URL(returnTo, req.url)
    url.searchParams.set("slack", "connected")
    return NextResponse.redirect(url)
  } catch (err) {
    console.error("Slack callback error:", err)
    const url = new URL(returnTo, req.url)
    url.searchParams.set("slack", "error")
    return NextResponse.redirect(url)
  }
}
