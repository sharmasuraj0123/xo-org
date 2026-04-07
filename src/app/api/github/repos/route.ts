import { NextResponse } from "next/server"
import { githubFetch } from "../../lib/github"
import { getActiveInstallation } from "../../lib/github-store"
import type { GitHubRepo } from "../../lib/types"

/**
 * GET /api/github/repos
 *
 * Lists all repositories accessible through the active GitHub App installation.
 * Supports pagination via ?page=1&per_page=30
 */
export async function GET(req: Request) {
  const installation = getActiveInstallation()

  if (!installation) {
    return NextResponse.json(
      { ok: false, error: "No active GitHub connection" },
      { status: 404 }
    )
  }

  const { searchParams } = new URL(req.url)
  const page = searchParams.get("page") ?? "1"
  const perPage = searchParams.get("per_page") ?? "30"

  try {
    const res = await githubFetch(
      installation.installationId,
      `/installation/repositories?page=${page}&per_page=${perPage}`
    )

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json(
        { ok: false, error: `GitHub API error (${res.status}): ${body}` },
        { status: res.status }
      )
    }

    const data = await res.json()

    const repos: GitHubRepo[] = (data.repositories ?? []).map(
      (r: Record<string, unknown>) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        private: r.private,
        description: r.description,
        defaultBranch: r.default_branch,
        language: r.language,
        url: r.html_url,
      })
    )

    return NextResponse.json({
      ok: true,
      data: {
        repos,
        totalCount: data.total_count,
        page: parseInt(page, 10),
        perPage: parseInt(perPage, 10),
      },
    })
  } catch (err) {
    console.error("GitHub repos error:", err)
    return NextResponse.json(
      { ok: false, error: "Failed to fetch repositories" },
      { status: 500 }
    )
  }
}
