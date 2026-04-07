/**
 * GitHub tool operations for agents.
 *
 * Every GitHub operation an agent can perform. Each tool function takes
 * params from the agent's tool_call, uses githubFetch() for auth,
 * and returns structured results.
 *
 * Agents call these via POST /api/github/tools — they never touch
 * the GitHub API directly.
 */

import { githubFetch } from "./github"
import { getActiveInstallation } from "./github-store"
import type {
  GitHubToolName,
  GitHubToolResult,
  GitHubToolDefinition,
} from "./types"

// ─── Tool Registry ───────────────────────────────────────────

export const GITHUB_TOOLS: GitHubToolDefinition[] = [
  // ── Repos ──────────────────────────────────────────────────
  {
    name: "github.repos.list",
    description: "List all repositories accessible to the org",
    params: {
      page: { type: "number", required: false, description: "Page number (default 1)" },
      per_page: { type: "number", required: false, description: "Results per page (default 30, max 100)" },
    },
  },
  {
    name: "github.repos.get",
    description: "Get details about a specific repository",
    params: {
      owner: { type: "string", required: true, description: "Repository owner (user or org)" },
      repo: { type: "string", required: true, description: "Repository name" },
    },
  },

  // ── Files ──────────────────────────────────────────────────
  {
    name: "github.files.read",
    description: "Read the contents of a file from a repository",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      path: { type: "string", required: true, description: "File path (e.g. src/index.ts)" },
      ref: { type: "string", required: false, description: "Branch, tag, or commit SHA (default: repo default branch)" },
    },
  },
  {
    name: "github.files.write",
    description: "Create or update a file in a repository (creates a commit)",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      path: { type: "string", required: true, description: "File path" },
      content: { type: "string", required: true, description: "File content (plain text, will be base64-encoded)" },
      message: { type: "string", required: true, description: "Commit message" },
      branch: { type: "string", required: false, description: "Target branch (default: repo default branch)" },
      sha: { type: "string", required: false, description: "SHA of the file being replaced (required for updates)" },
    },
  },
  {
    name: "github.files.tree",
    description: "List files and directories at a path in a repository",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      path: { type: "string", required: false, description: "Directory path (default: root)" },
      ref: { type: "string", required: false, description: "Branch, tag, or commit SHA" },
    },
  },

  // ── Branches ───────────────────────────────────────────────
  {
    name: "github.branches.list",
    description: "List branches in a repository",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
    },
  },
  {
    name: "github.branches.create",
    description: "Create a new branch from a source branch or SHA",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      branch: { type: "string", required: true, description: "New branch name" },
      from: { type: "string", required: false, description: "Source branch name or SHA (default: repo default branch)" },
    },
  },

  // ── Commits ────────────────────────────────────────────────
  {
    name: "github.commits.list",
    description: "List commits in a repository",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      sha: { type: "string", required: false, description: "Branch or SHA to list commits from" },
      path: { type: "string", required: false, description: "Only commits containing this file path" },
      per_page: { type: "number", required: false, description: "Results per page (default 30)" },
    },
  },
  {
    name: "github.commits.push",
    description: "Push multiple file changes as a single commit",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      branch: { type: "string", required: true, description: "Target branch" },
      message: { type: "string", required: true, description: "Commit message" },
      files: { type: "array", required: true, description: "Array of {path, content} objects to commit" },
    },
  },

  // ── Pull Requests ──────────────────────────────────────────
  {
    name: "github.pulls.list",
    description: "List pull requests in a repository",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      state: { type: "string", required: false, description: "Filter by state: open, closed, all (default: open)" },
      per_page: { type: "number", required: false, description: "Results per page (default 30)" },
    },
  },
  {
    name: "github.pulls.get",
    description: "Get details of a specific pull request",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      pull_number: { type: "number", required: true, description: "Pull request number" },
    },
  },
  {
    name: "github.pulls.create",
    description: "Create a new pull request",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      title: { type: "string", required: true, description: "PR title" },
      body: { type: "string", required: false, description: "PR description" },
      head: { type: "string", required: true, description: "Source branch" },
      base: { type: "string", required: false, description: "Target branch (default: repo default branch)" },
    },
  },
  {
    name: "github.pulls.merge",
    description: "Merge a pull request",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      pull_number: { type: "number", required: true, description: "Pull request number" },
      merge_method: { type: "string", required: false, description: "Merge method: merge, squash, rebase (default: merge)" },
    },
  },
  {
    name: "github.pulls.comment",
    description: "Add a comment to a pull request",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      pull_number: { type: "number", required: true, description: "Pull request number" },
      body: { type: "string", required: true, description: "Comment body (markdown)" },
    },
  },
  {
    name: "github.pulls.review",
    description: "Submit a review on a pull request",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      pull_number: { type: "number", required: true, description: "Pull request number" },
      body: { type: "string", required: true, description: "Review body" },
      event: { type: "string", required: true, description: "Review action: APPROVE, REQUEST_CHANGES, or COMMENT" },
    },
  },
  {
    name: "github.pulls.diff",
    description: "Get the diff of a pull request",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      pull_number: { type: "number", required: true, description: "Pull request number" },
    },
  },

  // ── Issues ─────────────────────────────────────────────────
  {
    name: "github.issues.list",
    description: "List issues in a repository",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      state: { type: "string", required: false, description: "Filter: open, closed, all (default: open)" },
      labels: { type: "string", required: false, description: "Comma-separated label names" },
      per_page: { type: "number", required: false, description: "Results per page (default 30)" },
    },
  },
  {
    name: "github.issues.get",
    description: "Get details of a specific issue",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      issue_number: { type: "number", required: true, description: "Issue number" },
    },
  },
  {
    name: "github.issues.create",
    description: "Create a new issue",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      title: { type: "string", required: true, description: "Issue title" },
      body: { type: "string", required: false, description: "Issue body (markdown)" },
      labels: { type: "array", required: false, description: "Array of label names" },
      assignees: { type: "array", required: false, description: "Array of GitHub usernames to assign" },
    },
  },
  {
    name: "github.issues.update",
    description: "Update an existing issue (title, body, state, labels, assignees)",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      issue_number: { type: "number", required: true, description: "Issue number" },
      title: { type: "string", required: false, description: "New title" },
      body: { type: "string", required: false, description: "New body" },
      state: { type: "string", required: false, description: "New state: open or closed" },
      labels: { type: "array", required: false, description: "Replace labels" },
      assignees: { type: "array", required: false, description: "Replace assignees" },
    },
  },
  {
    name: "github.issues.comment",
    description: "Add a comment to an issue",
    params: {
      owner: { type: "string", required: true, description: "Repository owner" },
      repo: { type: "string", required: true, description: "Repository name" },
      issue_number: { type: "number", required: true, description: "Issue number" },
      body: { type: "string", required: true, description: "Comment body (markdown)" },
    },
  },

  // ── Search ─────────────────────────────────────────────────
  {
    name: "github.search.code",
    description: "Search for code across repositories",
    params: {
      q: { type: "string", required: true, description: "Search query (e.g. 'useState repo:my-org/frontend')" },
      per_page: { type: "number", required: false, description: "Results per page (default 30, max 100)" },
    },
  },
  {
    name: "github.search.issues",
    description: "Search issues and pull requests across repositories",
    params: {
      q: { type: "string", required: true, description: "Search query (e.g. 'bug label:critical is:open')" },
      per_page: { type: "number", required: false, description: "Results per page (default 30)" },
    },
  },
  {
    name: "github.search.repos",
    description: "Search for repositories",
    params: {
      q: { type: "string", required: true, description: "Search query" },
      per_page: { type: "number", required: false, description: "Results per page (default 30)" },
    },
  },
]

// ─── Tool Executor ───────────────────────────────────────────

export async function executeGitHubTool(
  tool: GitHubToolName,
  params: Record<string, unknown>
): Promise<GitHubToolResult> {
  const installation = getActiveInstallation()
  if (!installation) {
    return { tool, ok: false, error: "No active GitHub connection" }
  }

  const instId = installation.installationId

  try {
    switch (tool) {
      // ── Repos ────────────────────────────────────────────
      case "github.repos.list":
        return await execReposList(instId, params)
      case "github.repos.get":
        return await execReposGet(instId, params)

      // ── Files ────────────────────────────────────────────
      case "github.files.read":
        return await execFilesRead(instId, params)
      case "github.files.write":
        return await execFilesWrite(instId, params)
      case "github.files.tree":
        return await execFilesTree(instId, params)

      // ── Branches ─────────────────────────────────────────
      case "github.branches.list":
        return await execBranchesList(instId, params)
      case "github.branches.create":
        return await execBranchesCreate(instId, params)

      // ── Commits ──────────────────────────────────────────
      case "github.commits.list":
        return await execCommitsList(instId, params)
      case "github.commits.push":
        return await execCommitsPush(instId, params)

      // ── Pull Requests ────────────────────────────────────
      case "github.pulls.list":
        return await execPullsList(instId, params)
      case "github.pulls.get":
        return await execPullsGet(instId, params)
      case "github.pulls.create":
        return await execPullsCreate(instId, params)
      case "github.pulls.merge":
        return await execPullsMerge(instId, params)
      case "github.pulls.comment":
        return await execPullsComment(instId, params)
      case "github.pulls.review":
        return await execPullsReview(instId, params)
      case "github.pulls.diff":
        return await execPullsDiff(instId, params)

      // ── Issues ───────────────────────────────────────────
      case "github.issues.list":
        return await execIssuesList(instId, params)
      case "github.issues.get":
        return await execIssuesGet(instId, params)
      case "github.issues.create":
        return await execIssuesCreate(instId, params)
      case "github.issues.update":
        return await execIssuesUpdate(instId, params)
      case "github.issues.comment":
        return await execIssuesComment(instId, params)

      // ── Search ───────────────────────────────────────────
      case "github.search.code":
        return await execSearchCode(instId, params)
      case "github.search.issues":
        return await execSearchIssues(instId, params)
      case "github.search.repos":
        return await execSearchRepos(instId, params)

      default:
        return { tool, ok: false, error: `Unknown tool: ${tool}` }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { tool, ok: false, error: message }
  }
}

// ─── Helper ──────────────────────────────────────────────────

async function ghJson(instId: number, path: string, opts?: RequestInit) {
  const res = await githubFetch(instId, path, opts)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API ${res.status}: ${body}`)
  }
  return res.json()
}

async function ghText(instId: number, path: string, opts?: RequestInit) {
  const res = await githubFetch(instId, path, opts)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API ${res.status}: ${body}`)
  }
  return res.text()
}

function ok(tool: GitHubToolName, data: unknown): GitHubToolResult {
  return { tool, ok: true, data }
}

// ─── Repo Operations ─────────────────────────────────────────

async function execReposList(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const page = p.page ?? 1
  const perPage = p.per_page ?? 30
  const data = await ghJson(instId, `/installation/repositories?page=${page}&per_page=${perPage}`)
  return ok("github.repos.list", {
    total_count: data.total_count,
    repos: data.repositories.map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      private: r.private,
      description: r.description,
      default_branch: r.default_branch,
      language: r.language,
      html_url: r.html_url,
    })),
  })
}

async function execReposGet(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const data = await ghJson(instId, `/repos/${p.owner}/${p.repo}`)
  return ok("github.repos.get", {
    id: data.id,
    name: data.name,
    full_name: data.full_name,
    private: data.private,
    description: data.description,
    default_branch: data.default_branch,
    language: data.language,
    html_url: data.html_url,
    topics: data.topics,
    open_issues_count: data.open_issues_count,
    stargazers_count: data.stargazers_count,
    forks_count: data.forks_count,
    created_at: data.created_at,
    updated_at: data.updated_at,
  })
}

// ─── File Operations ─────────────────────────────────────────

async function execFilesRead(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const ref = p.ref ? `?ref=${p.ref}` : ""
  const data = await ghJson(instId, `/repos/${p.owner}/${p.repo}/contents/${p.path}${ref}`)

  if (Array.isArray(data)) {
    // It's a directory listing
    return ok("github.files.read", {
      type: "directory",
      entries: data.map((e: Record<string, unknown>) => ({
        name: e.name,
        path: e.path,
        type: e.type,
        size: e.size,
        sha: e.sha,
      })),
    })
  }

  // Decode file content from base64
  let content: string
  if (data.encoding === "base64" && data.content) {
    content = Buffer.from(data.content as string, "base64").toString("utf-8")
  } else {
    content = data.content ?? ""
  }

  return ok("github.files.read", {
    type: "file",
    path: data.path,
    name: data.name,
    size: data.size,
    sha: data.sha,
    content,
    encoding: "utf-8",
  })
}

async function execFilesWrite(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const body: Record<string, unknown> = {
    message: p.message,
    content: Buffer.from(p.content as string).toString("base64"),
  }
  if (p.branch) body.branch = p.branch
  if (p.sha) body.sha = p.sha

  const data = await ghJson(
    instId,
    `/repos/${p.owner}/${p.repo}/contents/${p.path}`,
    { method: "PUT", body: JSON.stringify(body) }
  )

  return ok("github.files.write", {
    path: data.content.path,
    sha: data.content.sha,
    commit_sha: data.commit.sha,
    commit_message: data.commit.message,
    html_url: data.content.html_url,
  })
}

async function execFilesTree(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const path = p.path ?? ""
  const ref = p.ref ? `?ref=${p.ref}` : ""
  const data = await ghJson(instId, `/repos/${p.owner}/${p.repo}/contents/${path}${ref}`)

  const entries = Array.isArray(data) ? data : [data]
  return ok("github.files.tree", {
    entries: entries.map((e: Record<string, unknown>) => ({
      name: e.name,
      path: e.path,
      type: e.type,
      size: e.size,
      sha: e.sha,
    })),
  })
}

// ─── Branch Operations ───────────────────────────────────────

async function execBranchesList(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const data = await ghJson(instId, `/repos/${p.owner}/${p.repo}/branches?per_page=100`)
  return ok("github.branches.list", {
    branches: data.map((b: Record<string, unknown>) => ({
      name: b.name,
      sha: (b.commit as Record<string, unknown>).sha,
      protected: b.protected,
    })),
  })
}

async function execBranchesCreate(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  // Get the SHA of the source
  let sourceSha: string
  if (p.from && typeof p.from === "string" && /^[0-9a-f]{40}$/i.test(p.from)) {
    sourceSha = p.from
  } else {
    const refName = p.from ?? "HEAD"
    const refData = await ghJson(instId, `/repos/${p.owner}/${p.repo}/git/ref/heads/${refName}`)
    sourceSha = refData.object.sha
  }

  const data = await ghJson(
    instId,
    `/repos/${p.owner}/${p.repo}/git/refs`,
    {
      method: "POST",
      body: JSON.stringify({
        ref: `refs/heads/${p.branch}`,
        sha: sourceSha,
      }),
    }
  )

  return ok("github.branches.create", {
    branch: p.branch,
    sha: data.object.sha,
    ref: data.ref,
  })
}

// ─── Commit Operations ───────────────────────────────────────

async function execCommitsList(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const params = new URLSearchParams()
  if (p.sha) params.set("sha", p.sha as string)
  if (p.path) params.set("path", p.path as string)
  params.set("per_page", String(p.per_page ?? 30))
  const qs = params.toString()

  const data = await ghJson(instId, `/repos/${p.owner}/${p.repo}/commits?${qs}`)

  return ok("github.commits.list", {
    commits: data.map((c: Record<string, unknown>) => {
      const commit = c.commit as Record<string, unknown>
      const author = commit.author as Record<string, unknown>
      return {
        sha: c.sha,
        message: commit.message,
        author: author.name,
        date: author.date,
        html_url: c.html_url,
      }
    }),
  })
}

async function execCommitsPush(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  // Multi-file commit using the Git Trees API
  const owner = p.owner as string
  const repo = p.repo as string
  const branch = p.branch as string
  const message = p.message as string
  const files = p.files as Array<{ path: string; content: string }>

  // 1. Get the current commit SHA of the branch
  const refData = await ghJson(instId, `/repos/${owner}/${repo}/git/ref/heads/${branch}`)
  const baseSha = refData.object.sha

  // 2. Get the tree SHA of that commit
  const commitData = await ghJson(instId, `/repos/${owner}/${repo}/git/commits/${baseSha}`)
  const baseTreeSha = commitData.tree.sha

  // 3. Create blobs for each file
  const treeItems = await Promise.all(
    files.map(async (file) => {
      const blobData = await ghJson(instId, `/repos/${owner}/${repo}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({
          content: file.content,
          encoding: "utf-8",
        }),
      })
      return {
        path: file.path,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blobData.sha,
      }
    })
  )

  // 4. Create a new tree
  const treeData = await ghJson(instId, `/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems,
    }),
  })

  // 5. Create a new commit
  const newCommitData = await ghJson(instId, `/repos/${owner}/${repo}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: treeData.sha,
      parents: [baseSha],
    }),
  })

  // 6. Update the branch ref
  await ghJson(instId, `/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: newCommitData.sha }),
  })

  return ok("github.commits.push", {
    commit_sha: newCommitData.sha,
    tree_sha: treeData.sha,
    message,
    files_changed: files.length,
    branch,
  })
}

// ─── Pull Request Operations ─────────────────────────────────

async function execPullsList(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const state = p.state ?? "open"
  const perPage = p.per_page ?? 30
  const data = await ghJson(instId, `/repos/${p.owner}/${p.repo}/pulls?state=${state}&per_page=${perPage}`)

  return ok("github.pulls.list", {
    pulls: data.map((pr: Record<string, unknown>) => {
      const user = pr.user as Record<string, unknown>
      const head = pr.head as Record<string, unknown>
      const base = pr.base as Record<string, unknown>
      return {
        number: pr.number,
        title: pr.title,
        state: pr.state,
        author: user.login,
        head: head.ref,
        base: base.ref,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        html_url: pr.html_url,
        draft: pr.draft,
        mergeable: pr.mergeable,
      }
    }),
  })
}

async function execPullsGet(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const data = await ghJson(instId, `/repos/${p.owner}/${p.repo}/pulls/${p.pull_number}`)
  const user = data.user as Record<string, unknown>
  const head = data.head as Record<string, unknown>
  const base = data.base as Record<string, unknown>

  return ok("github.pulls.get", {
    number: data.number,
    title: data.title,
    body: data.body,
    state: data.state,
    author: user.login,
    head: head.ref,
    base: base.ref,
    merged: data.merged,
    mergeable: data.mergeable,
    draft: data.draft,
    additions: data.additions,
    deletions: data.deletions,
    changed_files: data.changed_files,
    created_at: data.created_at,
    updated_at: data.updated_at,
    html_url: data.html_url,
    diff_url: data.diff_url,
  })
}

async function execPullsCreate(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const body: Record<string, unknown> = {
    title: p.title,
    head: p.head,
    base: p.base ?? "main",
  }
  if (p.body) body.body = p.body

  const data = await ghJson(
    instId,
    `/repos/${p.owner}/${p.repo}/pulls`,
    { method: "POST", body: JSON.stringify(body) }
  )

  return ok("github.pulls.create", {
    number: data.number,
    title: data.title,
    html_url: data.html_url,
    state: data.state,
    head: (data.head as Record<string, unknown>).ref,
    base: (data.base as Record<string, unknown>).ref,
  })
}

async function execPullsMerge(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const body: Record<string, unknown> = {}
  if (p.merge_method) body.merge_method = p.merge_method

  const data = await ghJson(
    instId,
    `/repos/${p.owner}/${p.repo}/pulls/${p.pull_number}/merge`,
    { method: "PUT", body: JSON.stringify(body) }
  )

  return ok("github.pulls.merge", {
    merged: data.merged,
    message: data.message,
    sha: data.sha,
  })
}

async function execPullsComment(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const data = await ghJson(
    instId,
    `/repos/${p.owner}/${p.repo}/issues/${p.pull_number}/comments`,
    { method: "POST", body: JSON.stringify({ body: p.body }) }
  )

  return ok("github.pulls.comment", {
    id: data.id,
    html_url: data.html_url,
    body: data.body,
  })
}

async function execPullsReview(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const data = await ghJson(
    instId,
    `/repos/${p.owner}/${p.repo}/pulls/${p.pull_number}/reviews`,
    {
      method: "POST",
      body: JSON.stringify({ body: p.body, event: p.event }),
    }
  )

  return ok("github.pulls.review", {
    id: data.id,
    state: data.state,
    html_url: data.html_url,
    body: data.body,
  })
}

async function execPullsDiff(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const diff = await ghText(instId, `/repos/${p.owner}/${p.repo}/pulls/${p.pull_number}`, {
    headers: { Accept: "application/vnd.github.diff" },
  })

  return ok("github.pulls.diff", { diff })
}

// ─── Issue Operations ────────────────────────────────────────

async function execIssuesList(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const params = new URLSearchParams()
  params.set("state", (p.state as string) ?? "open")
  params.set("per_page", String(p.per_page ?? 30))
  if (p.labels) params.set("labels", p.labels as string)

  const data = await ghJson(instId, `/repos/${p.owner}/${p.repo}/issues?${params}`)

  return ok("github.issues.list", {
    issues: data
      .filter((i: Record<string, unknown>) => !i.pull_request) // Exclude PRs
      .map((i: Record<string, unknown>) => {
        const user = i.user as Record<string, unknown>
        return {
          number: i.number,
          title: i.title,
          state: i.state,
          author: user.login,
          labels: (i.labels as Array<Record<string, unknown>>).map((l) => l.name),
          created_at: i.created_at,
          updated_at: i.updated_at,
          html_url: i.html_url,
          comments: i.comments,
        }
      }),
  })
}

async function execIssuesGet(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const data = await ghJson(instId, `/repos/${p.owner}/${p.repo}/issues/${p.issue_number}`)
  const user = data.user as Record<string, unknown>

  return ok("github.issues.get", {
    number: data.number,
    title: data.title,
    body: data.body,
    state: data.state,
    author: user.login,
    labels: (data.labels as Array<Record<string, unknown>>).map((l) => l.name),
    assignees: (data.assignees as Array<Record<string, unknown>>).map((a) => a.login),
    created_at: data.created_at,
    updated_at: data.updated_at,
    html_url: data.html_url,
    comments: data.comments,
  })
}

async function execIssuesCreate(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const body: Record<string, unknown> = { title: p.title }
  if (p.body) body.body = p.body
  if (p.labels) body.labels = p.labels
  if (p.assignees) body.assignees = p.assignees

  const data = await ghJson(
    instId,
    `/repos/${p.owner}/${p.repo}/issues`,
    { method: "POST", body: JSON.stringify(body) }
  )

  return ok("github.issues.create", {
    number: data.number,
    title: data.title,
    html_url: data.html_url,
    state: data.state,
  })
}

async function execIssuesUpdate(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const body: Record<string, unknown> = {}
  if (p.title !== undefined) body.title = p.title
  if (p.body !== undefined) body.body = p.body
  if (p.state !== undefined) body.state = p.state
  if (p.labels !== undefined) body.labels = p.labels
  if (p.assignees !== undefined) body.assignees = p.assignees

  const data = await ghJson(
    instId,
    `/repos/${p.owner}/${p.repo}/issues/${p.issue_number}`,
    { method: "PATCH", body: JSON.stringify(body) }
  )

  return ok("github.issues.update", {
    number: data.number,
    title: data.title,
    state: data.state,
    html_url: data.html_url,
  })
}

async function execIssuesComment(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const data = await ghJson(
    instId,
    `/repos/${p.owner}/${p.repo}/issues/${p.issue_number}/comments`,
    { method: "POST", body: JSON.stringify({ body: p.body }) }
  )

  return ok("github.issues.comment", {
    id: data.id,
    html_url: data.html_url,
    body: data.body,
  })
}

// ─── Search Operations ───────────────────────────────────────

async function execSearchCode(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const params = new URLSearchParams()
  params.set("q", p.q as string)
  params.set("per_page", String(p.per_page ?? 30))

  const data = await ghJson(instId, `/search/code?${params}`)

  return ok("github.search.code", {
    total_count: data.total_count,
    items: data.items.map((item: Record<string, unknown>) => {
      const repo = item.repository as Record<string, unknown>
      return {
        name: item.name,
        path: item.path,
        sha: item.sha,
        html_url: item.html_url,
        repository: repo.full_name,
        score: item.score,
      }
    }),
  })
}

async function execSearchIssues(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const params = new URLSearchParams()
  params.set("q", p.q as string)
  params.set("per_page", String(p.per_page ?? 30))

  const data = await ghJson(instId, `/search/issues?${params}`)

  return ok("github.search.issues", {
    total_count: data.total_count,
    items: data.items.map((item: Record<string, unknown>) => ({
      number: item.number,
      title: item.title,
      state: item.state,
      html_url: item.html_url,
      is_pull_request: Boolean(item.pull_request),
      created_at: item.created_at,
      score: item.score,
    })),
  })
}

async function execSearchRepos(instId: number, p: Record<string, unknown>): Promise<GitHubToolResult> {
  const params = new URLSearchParams()
  params.set("q", p.q as string)
  params.set("per_page", String(p.per_page ?? 30))

  const data = await ghJson(instId, `/search/repositories?${params}`)

  return ok("github.search.repos", {
    total_count: data.total_count,
    items: data.items.map((item: Record<string, unknown>) => ({
      full_name: item.full_name,
      description: item.description,
      language: item.language,
      stargazers_count: item.stargazers_count,
      html_url: item.html_url,
      private: item.private,
      score: item.score,
    })),
  })
}
