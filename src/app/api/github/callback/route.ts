import { NextResponse } from "next/server"
import { githubFetch, isGitHubConfigured } from "../../lib/github"
import { saveInstallation } from "../../lib/github-store"

/**
 * GET /api/github/callback
 *
 * Handles the redirect from GitHub after the user installs the app.
 * GitHub sends: ?installation_id=123&setup_action=install&state=...
 *
 * We store the installation and redirect the user back to the connections page.
 */
export async function GET(req: Request) {
  if (!isGitHubConfigured()) {
    return NextResponse.json(
      { ok: false, error: "GitHub App is not configured" },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(req.url)
  const installationId = searchParams.get("installation_id")
  const setupAction = searchParams.get("setup_action")
  const stateParam = searchParams.get("state")

  if (!installationId) {
    return NextResponse.json(
      { ok: false, error: "Missing installation_id" },
      { status: 400 }
    )
  }

  const installId = parseInt(installationId, 10)

  // Decode return URL from state
  let returnTo = "/org/connections"
  if (stateParam) {
    try {
      const state = JSON.parse(Buffer.from(stateParam, "base64url").toString())
      if (state.returnTo) returnTo = state.returnTo
    } catch {
      // Ignore malformed state
    }
  }

  // If the user deleted the app installation
  if (setupAction === "uninstall") {
    const { removeInstallation } = await import("../../lib/github-store")
    removeInstallation(installId)
    const url = new URL(returnTo, req.url)
    url.searchParams.set("github", "disconnected")
    return NextResponse.redirect(url)
  }

  try {
    // Fetch installation details from GitHub to get the account info
    const res = await githubFetch(installId, `/installation/repositories?per_page=1`)

    let githubUsername = "unknown"
    let avatarUrl: string | null = null
    let repoScope: "all" | string[] = "all"

    if (res.ok) {
      const data = await res.json()
      // Get account info from the first repo or installation metadata
      if (data.repositories?.length > 0) {
        const owner = data.repositories[0].owner
        githubUsername = owner.login
        avatarUrl = owner.avatar_url
      }
      // If total_count differs from returned count, it's a subset
      if (data.repository_selection === "selected") {
        repoScope = "all" // We'll fetch full list later
      }
    }

    // Persist the installation
    saveInstallation(installId, githubUsername, avatarUrl, repoScope)

    // Redirect back with success indicator
    const url = new URL(returnTo, req.url)
    url.searchParams.set("github", "connected")
    return NextResponse.redirect(url)
  } catch (err) {
    console.error("GitHub callback error:", err)
    const url = new URL(returnTo, req.url)
    url.searchParams.set("github", "error")
    return NextResponse.redirect(url)
  }
}
