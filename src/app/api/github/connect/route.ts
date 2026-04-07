import { NextResponse } from "next/server"
import { getGitHubClientId, isGitHubConfigured } from "../../lib/github"

/**
 * GET /api/github/connect
 *
 * Redirects the user to the GitHub App installation page.
 * After the user installs (or reconfigures) the app, GitHub
 * redirects back to /api/github/callback.
 */
export async function GET(req: Request) {
  if (!isGitHubConfigured()) {
    return NextResponse.json(
      { ok: false, error: "GitHub App is not configured" },
      { status: 503 }
    )
  }

  const clientId = getGitHubClientId()
  if (!clientId) {
    return NextResponse.json(
      { ok: false, error: "GITHUB_CLIENT_ID is not configured" },
      { status: 503 }
    )
  }

  // Pass origin so callback can redirect back to the right page
  const { searchParams } = new URL(req.url)
  const returnTo = searchParams.get("return_to") ?? "/org/connections"

  // state parameter encodes the return URL (signed in production)
  const state = Buffer.from(JSON.stringify({ returnTo })).toString("base64url")

  const installUrl =
    `https://github.com/apps/${process.env.GITHUB_APP_SLUG ?? "xo-org"}/installations/new` +
    `?state=${state}`

  return NextResponse.redirect(installUrl)
}
