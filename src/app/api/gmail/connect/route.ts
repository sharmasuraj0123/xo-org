import { NextResponse } from "next/server"
import { buildOAuthUrl, isGmailConfigured } from "../../lib/gmail"

/**
 * GET /api/gmail/connect
 *
 * Redirects the user to Google's OAuth consent screen.
 * After the user approves, Google redirects to /api/gmail/callback.
 */
export async function GET(req: Request) {
  if (!isGmailConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Gmail connector is not configured" },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(req.url)
  const returnTo = searchParams.get("return_to") ?? "/org/connections"

  // State parameter for CSRF protection + return URL
  const state = Buffer.from(
    JSON.stringify({
      returnTo,
      nonce: crypto.randomUUID(),
    })
  ).toString("base64url")

  const authUrl = buildOAuthUrl(state)
  return NextResponse.redirect(authUrl)
}
