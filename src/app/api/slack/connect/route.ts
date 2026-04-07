import { NextResponse } from "next/server"
import { buildSlackOAuthUrl, isSlackConfigured } from "../../lib/slack"

/**
 * GET /api/slack/connect
 *
 * Redirects the user to Slack's OAuth consent page.
 */
export async function GET(req: Request) {
  if (!isSlackConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Slack connector is not configured" },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(req.url)
  const returnTo = searchParams.get("return_to") ?? "/org/connections"

  const state = Buffer.from(
    JSON.stringify({ returnTo, nonce: crypto.randomUUID() })
  ).toString("base64url")

  return NextResponse.redirect(buildSlackOAuthUrl(state))
}
