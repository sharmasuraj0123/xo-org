import { NextResponse } from "next/server"
import { githubFetch } from "../../lib/github"
import {
  getActiveInstallation,
  removeInstallation,
} from "../../lib/github-store"

/**
 * DELETE /api/github/disconnect
 *
 * Disconnects the GitHub App installation. Optionally calls GitHub's API
 * to actually uninstall the app from the user's account.
 */
export async function DELETE(req: Request) {
  const installation = getActiveInstallation()

  if (!installation) {
    return NextResponse.json(
      { ok: false, error: "No active GitHub connection" },
      { status: 404 }
    )
  }

  const { searchParams } = new URL(req.url)
  const uninstallFromGitHub = searchParams.get("uninstall") === "true"

  // Optionally uninstall the app from GitHub
  if (uninstallFromGitHub) {
    try {
      await githubFetch(
        installation.installationId,
        `/app/installations/${installation.installationId}`,
        { method: "DELETE" }
      )
    } catch (err) {
      console.error("Failed to uninstall GitHub App:", err)
      // Continue with local removal even if GitHub API fails
    }
  }

  removeInstallation(installation.installationId)

  return NextResponse.json({
    ok: true,
    data: { disconnected: true },
  })
}
