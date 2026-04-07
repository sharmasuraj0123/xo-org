import { NextResponse } from "next/server"
import { isGitHubConfigured } from "../../lib/github"
import { getActiveInstallation } from "../../lib/github-store"

/**
 * GET /api/github/status
 *
 * Returns the current GitHub connection status.
 */
export async function GET() {
  if (!isGitHubConfigured()) {
    return NextResponse.json({
      ok: true,
      data: {
        configured: false,
        connected: false,
        installation: null,
      },
    })
  }

  const installation = getActiveInstallation()

  return NextResponse.json({
    ok: true,
    data: {
      configured: true,
      connected: installation?.status === "connected",
      installation: installation
        ? {
            installationId: installation.installationId,
            githubUsername: installation.githubUsername,
            avatarUrl: installation.avatarUrl,
            repoScope: installation.repoScope,
            status: installation.status,
            connectedAt: installation.connectedAt,
            updatedAt: installation.updatedAt,
          }
        : null,
    },
  })
}
