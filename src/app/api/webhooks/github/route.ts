import { NextResponse } from "next/server"
import { verifyWebhookSignature } from "../../lib/github"
import {
  updateInstallationStatus,
  removeInstallation,
  saveInstallation,
  updateInstallationRepos,
} from "../../lib/github-store"
import { appendMessage, notifySubscribers } from "../../lib/bridge"

/**
 * POST /api/webhooks/github
 *
 * Receives webhook events from GitHub. Verifies the HMAC-SHA256 signature,
 * handles installation lifecycle events, and routes relevant events
 * (push, PR, issues) into the bridge as agent-readable messages.
 */
export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get("x-hub-signature-256")
  const event = req.headers.get("x-github-event")
  const deliveryId = req.headers.get("x-github-delivery")

  // Verify webhook signature
  const valid = await verifyWebhookSignature(body, signature)
  if (!valid) {
    console.warn(`[webhook] Invalid signature for delivery ${deliveryId}`)
    return NextResponse.json(
      { ok: false, error: "Invalid signature" },
      { status: 401 }
    )
  }

  const payload = JSON.parse(body)

  // Route by event type
  switch (event) {
    case "installation":
      handleInstallation(payload)
      break

    case "installation_repositories":
      handleInstallationRepos(payload)
      break

    case "push":
      routePushEvent(payload)
      break

    case "pull_request":
      routePullRequestEvent(payload)
      break

    case "issues":
      routeIssuesEvent(payload)
      break

    case "issue_comment":
      routeIssueCommentEvent(payload)
      break

    default:
      // Acknowledge but ignore unhandled events
      break
  }

  return NextResponse.json({ ok: true })
}

// ─── Installation Lifecycle ──────────────────────────────────

function handleInstallation(payload: Record<string, unknown>) {
  const action = payload.action as string
  const installation = payload.installation as Record<string, unknown>
  const installId = installation.id as number
  const account = installation.account as Record<string, unknown>

  switch (action) {
    case "created": {
      const repos = payload.repositories as Array<Record<string, unknown>> | undefined
      const repoScope: "all" | string[] = repos
        ? repos.map((r) => r.full_name as string)
        : "all"
      saveInstallation(
        installId,
        account.login as string,
        (account.avatar_url as string) ?? null,
        repoScope
      )
      break
    }
    case "deleted":
    case "suspend":
      removeInstallation(installId)
      break
    case "unsuspend":
      updateInstallationStatus(installId, "connected")
      break
  }
}

function handleInstallationRepos(payload: Record<string, unknown>) {
  const installation = payload.installation as Record<string, unknown>
  const installId = installation.id as number
  const added = payload.repositories_added as Array<Record<string, unknown>> | undefined
  const removed = payload.repositories_removed as Array<Record<string, unknown>> | undefined

  // For simplicity, re-fetch the full list isn't done here.
  // We note the change in the store.
  if (added || removed) {
    updateInstallationRepos(installId, "all")
  }
}

// ─── Event → Bridge Message Routing ─────────────────────────

function routePushEvent(payload: Record<string, unknown>) {
  const repo = payload.repository as Record<string, unknown>
  const pusher = payload.pusher as Record<string, unknown>
  const ref = payload.ref as string
  const commits = payload.commits as Array<Record<string, unknown>> | undefined
  const branch = ref.replace("refs/heads/", "")
  const commitCount = commits?.length ?? 0

  const text =
    `Push to **${repo.full_name}** on \`${branch}\` by ${pusher.name}` +
    ` — ${commitCount} commit${commitCount === 1 ? "" : "s"}`

  const msg = appendMessage("github", "#devops", "tell", {
    text,
    metadata: {
      githubEvent: "push",
      repo: repo.full_name,
      branch,
      pusher: pusher.name,
      commitCount,
      compareUrl: payload.compare,
    },
  })
  notifySubscribers(msg)
}

function routePullRequestEvent(payload: Record<string, unknown>) {
  const action = payload.action as string
  const pr = payload.pull_request as Record<string, unknown>
  const repo = payload.repository as Record<string, unknown>
  const sender = payload.sender as Record<string, unknown>

  const text =
    `PR ${action}: **${pr.title}** (#${pr.number}) in ${repo.full_name}` +
    ` by ${sender.login}`

  // Route PR events to code-review channel
  const msg = appendMessage("github", "#code-review", "tell", {
    text,
    artifacts: [pr.html_url as string],
    metadata: {
      githubEvent: "pull_request",
      action,
      repo: repo.full_name,
      prNumber: pr.number,
      prTitle: pr.title,
      sender: sender.login,
      prUrl: pr.html_url,
    },
  })
  notifySubscribers(msg)
}

function routeIssuesEvent(payload: Record<string, unknown>) {
  const action = payload.action as string
  const issue = payload.issue as Record<string, unknown>
  const repo = payload.repository as Record<string, unknown>
  const sender = payload.sender as Record<string, unknown>

  const text =
    `Issue ${action}: **${issue.title}** (#${issue.number}) in ${repo.full_name}` +
    ` by ${sender.login}`

  // Route issues to general channel
  const msg = appendMessage("github", "#general", "tell", {
    text,
    artifacts: [issue.html_url as string],
    metadata: {
      githubEvent: "issues",
      action,
      repo: repo.full_name,
      issueNumber: issue.number,
      issueTitle: issue.title,
      sender: sender.login,
      issueUrl: issue.html_url,
      labels: (issue.labels as Array<Record<string, unknown>>)?.map(
        (l) => l.name
      ),
    },
  })
  notifySubscribers(msg)
}

function routeIssueCommentEvent(payload: Record<string, unknown>) {
  const action = payload.action as string
  if (action !== "created") return // Only route new comments

  const comment = payload.comment as Record<string, unknown>
  const issue = payload.issue as Record<string, unknown>
  const repo = payload.repository as Record<string, unknown>
  const sender = payload.sender as Record<string, unknown>

  const isPR = Boolean(
    (issue as Record<string, unknown>).pull_request
  )

  const text =
    `Comment on ${isPR ? "PR" : "issue"} **${issue.title}** (#${issue.number})` +
    ` in ${repo.full_name} by ${sender.login}:` +
    ` "${(comment.body as string).slice(0, 200)}"`

  const channel = isPR ? "#code-review" : "#general"

  const msg = appendMessage("github", channel, "tell", {
    text,
    artifacts: [comment.html_url as string],
    metadata: {
      githubEvent: "issue_comment",
      repo: repo.full_name,
      issueNumber: issue.number,
      isPR,
      sender: sender.login,
      commentUrl: comment.html_url,
    },
  })
  notifySubscribers(msg)
}
