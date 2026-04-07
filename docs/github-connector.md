# GitHub App Connector — Documentation

## Overview

The GitHub App connector integrates XO Org with GitHub, enabling agents to access repositories, issues, and pull requests. It uses the **GitHub App** authentication method — the same approach used by Manus AI — which provides fine-grained permissions, short-lived tokens, and a dedicated bot identity.

Once connected, GitHub events (pushes, PRs, issues) are automatically routed into the bridge as agent-readable messages, and agents can make authenticated GitHub API calls through the org.

---

## Architecture

### High-Level Data Flow

```
┌─────────────────────��────────────────────────────────��──────────────┐
│                           XO Org                                     │
│                                                                      │
│  ┌──────────┐    ┌────────────────┐    ┌──────────────┐              │
│  │  Bridge   │◄──│ Webhook Handler│◄───│ GitHub API   │              │
│  │ (events)  │   │ /api/webhooks/ │    │ (inbound     │              │
│  │           │   │ github         │    │  events)     │              │
│  └─────┬─────┘   └────────────────┘    └──────────────┘              │
│        │                                                             │
│        │ Messages routed                                             │
│        │ to agents via                                               │
│        │ channels                                                    │
│        │                                                             │
│  ┌─────▼─────┐   ┌────────────────┐    ┌──────────────┐             │
│  │  Agents   │──►│ Token Manager  │───►│ GitHub API   │             │
│  │           │   │ (github.ts)    │    │ (outbound    │             │
│  │  rex,     │   │                │    │  requests)   │             │
│  │  aria,    │   │ JWT → Install  │    └──────────────┘             │
│  │  nova ... │   │ Token → Cache  │                                  │
│  └───────────┘   └────────────────┘                                  │
│                                                                      │
│  ┌────────────────┐   ┌──────────────────┐                           │
│  │ GitHub Store   │   │ Governance       │                           │
│  │ (github-       │   │ (rate limits,    │                           │
│  │  store.ts)     │   │  permissions)    │                           │
│  │                │   │                  │                           │
│  │ Installation   │   │ Controls which   │                           │
│  │ persistence    │   │ agents can use   │                           │
│  └────────────────┘   │ GitHub tools     │                           │
│                       └──────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
          │                         ▲
          │  Install flow           │  Webhooks
          ▼                         │
┌─────────────────────��───────────────────────────────────────────────┐
│                         GitHub.com                                    │
│                                                                      │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐  ┌───────────────┐   │
│  │ GitHub    │  │ Repos      │  │ Issues     │  │ Pull          │   │
│  │ App       │  │            │  │            │  │ Requests      │   │
│  │ (xo-org)  │  │ Read/Write │  │ Read/Write │  │ Read/Write    │   │
│  └───────────┘  └────────────┘  └────────────┘  └───────────────┘   │
└───────────────────────────���─────────────────────────────────────────┘
```

### Connection Flow (User Perspective)

```
User clicks                GitHub.com                 XO Org
"Connect GitHub"           App Install Page            Callback
     │                          │                        │
     │  GET /api/github/connect │                        │
     ├─────────────────────────►│                        │
     │                          │                        │
     │  Redirect to GitHub      │                        │
     │◄─────────────────────────┤                        │
     │                          │                        │
     │  User selects repos      │                        │
     │  and clicks "Install"    │                        │
     │─────────────────────���───►│                        │
     │                          │                        │
     │                          │  GET /api/github/      │
     │                          │  callback?             │
     │                          │  installation_id=123   │
     │                          │  &setup_action=install │
     │                          ├───────────────────────►│
     │                          │                        │
     │                          │    Store installation  │
     │                          │    Fetch account info  │
     │                          │    Redirect to /org/   │
     │                          │    connections         │
     │◄────────────────��────────┼────────────────────────┤
     │                          │                        │
     │  Connected! UI shows     │                        │
     │  username, repos, status │                        │
```

### Token Lifecycle

```
                    ┌─────────────────────┐
                    │  App Private Key    │
                    │  (PEM, base64 in    │
                    │   env var)          │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Create JWT         │
                    │  (RS256 signed)     │
                    │  Valid: 10 minutes  │
                    └─────────┬───────────┘
                              │
                    POST /app/installations/
                    {id}/access_tokens
                              │
                              ▼
                    ┌─────────────────────┐
                    │  Installation Token │
                    │  Valid: 1 hour      │
                    │  Cached in memory   │
                    └─────────┬───────────┘
                              │
                    Auto-refresh 5 min
                    before expiry
                              │
                              ▼
                    ┌─────────────────────┐
                    │  GitHub API Calls   │
                    │  Authenticated as   │
                    │  xo-org[bot]        │
                    └─────────────────────┘
```

### Webhook Event Routing

```
GitHub Event                Bridge Message              Channel
────────────                ──────────────              ───────
push                   ──►  {type: "tell"}         ──►  #devops
pull_request           ──►  {type: "tell"}         ──►  #code-review
issues                 ──►  {type: "tell"}         ──►  #general
issue_comment (on PR)  ──►  {type: "tell"}         ──►  #code-review
issue_comment (issue)  ──►  {type: "tell"}         ──►  #general
installation.deleted   ──►  (remove installation)      (internal)
```

All webhook messages include structured `metadata` with the full event details (repo, sender, PR number, etc.) so agents can programmatically parse them.

---

## File Structure

```
src/app/api/
├── lib/
│   ├── types.ts              # GitHubInstallation, GitHubToolName, etc.
│   ├── github.ts             # Token manager, JWT, webhook verification
│   ├── github-store.ts       # Installation persistence (in-memory)
│   └── github-tools.ts       # Tool registry + all 25 tool implementations
├── github/
│   ├── connect/route.ts      # GET  — Redirect to GitHub App install
│   ├── callback/route.ts     # GET  — Handle post-install redirect
│   ├── status/route.ts       # GET  — Connection status
│   ├── disconnect/route.ts   # DELETE — Remove connection
│   ├── repos/route.ts        # GET  — List accessible repos
│   └── tools/route.ts        # GET  — Tool discovery | POST — Execute tool
└── webhooks/
    └── github/route.ts       # POST — Receive & verify GitHub webhooks

src/components/xo/
└── github-connector.tsx      # Client component — connect/status/repos UI

src/app/
├── org/connections/page.tsx   # Org mode connections page
└── agent/(solo)/connections/page.tsx  # Agent mode connections page
```

---

## API Reference

### `GET /api/github/connect`

Redirects the user to the GitHub App installation page.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `return_to` | string | `/org/connections` | URL to redirect back to after install |

**Response:** 302 redirect to `https://github.com/apps/{slug}/installations/new`

---

### `GET /api/github/callback`

Handles the redirect from GitHub after app installation. Stores the installation data and redirects the user back to the connections page.

**Query Parameters (from GitHub):**
| Param | Type | Description |
|-------|------|-------------|
| `installation_id` | number | The GitHub App installation ID |
| `setup_action` | string | `install`, `update`, or `uninstall` |
| `state` | string | Encoded return URL |

**Response:** 302 redirect to `return_to` URL with `?github=connected|disconnected|error`

---

### `GET /api/github/status`

Returns the current GitHub connection status.

**Response:**
```json
{
  "ok": true,
  "data": {
    "configured": true,
    "connected": true,
    "installation": {
      "installationId": 12345678,
      "githubUsername": "my-org",
      "avatarUrl": "https://avatars.githubusercontent.com/u/...",
      "repoScope": "all",
      "status": "connected",
      "connectedAt": 1712300000000,
      "updatedAt": 1712300000000
    }
  }
}
```

---

### `DELETE /api/github/disconnect`

Removes the stored GitHub installation.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `uninstall` | string | `false` | Set to `"true"` to also uninstall the app from GitHub |

**Response:**
```json
{
  "ok": true,
  "data": { "disconnected": true }
}
```

---

### `GET /api/github/repos`

Lists repositories accessible through the active installation.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `per_page` | number | `30` | Results per page |

**Response:**
```json
{
  "ok": true,
  "data": {
    "repos": [
      {
        "id": 123456,
        "name": "frontend",
        "fullName": "my-org/frontend",
        "private": true,
        "description": "Main frontend application",
        "defaultBranch": "main",
        "language": "TypeScript",
        "url": "https://github.com/my-org/frontend"
      }
    ],
    "totalCount": 15,
    "page": 1,
    "perPage": 30
  }
}
```

---

### `POST /api/webhooks/github`

Receives webhook events from GitHub. Verifies the HMAC-SHA256 signature and routes events into the bridge.

**Headers (from GitHub):**
| Header | Description |
|--------|-------------|
| `X-Hub-Signature-256` | HMAC-SHA256 signature of the payload |
| `X-GitHub-Event` | Event type (push, pull_request, issues, etc.) |
| `X-GitHub-Delivery` | Unique delivery ID |

**Handled Events:**
| Event | Action |
|-------|--------|
| `installation` (created) | Store new installation |
| `installation` (deleted/suspend) | Remove installation |
| `installation_repositories` | Update repo scope |
| `push` | Route to `#devops` channel |
| `pull_request` | Route to `#code-review` channel |
| `issues` | Route to `#general` channel |
| `issue_comment` | Route to `#code-review` (PR) or `#general` (issue) |

**Response:** `{ "ok": true }` (always 200 to acknowledge receipt)

---

### `GET /api/github/tools` — Tool Discovery

Returns the list of all GitHub tools available to agents. Agents call this on connect to learn what they can do.

**Response (when connected):**
```json
{
  "ok": true,
  "data": {
    "available": true,
    "connected": true,
    "github_username": "my-org",
    "tools": [
      {
        "name": "github.files.read",
        "description": "Read the contents of a file from a repository",
        "params": {
          "owner": { "type": "string", "required": true, "description": "Repository owner" },
          "repo": { "type": "string", "required": true, "description": "Repository name" },
          "path": { "type": "string", "required": true, "description": "File path" },
          "ref": { "type": "string", "required": false, "description": "Branch or SHA" }
        }
      }
    ]
  }
}
```

---

### `POST /api/github/tools` — Execute Tool

Executes a GitHub tool on behalf of an agent. The call and result are logged to the bridge for audit.

**Request Body:**
```json
{
  "agent_id": "rex",
  "tool": "github.files.read",
  "params": {
    "owner": "my-org",
    "repo": "frontend",
    "path": "src/index.ts"
  }
}
```

**Response:**
```json
{
  "ok": true,
  "tool": "github.files.read",
  "call_id": "m_018f..._abc",
  "data": {
    "type": "file",
    "path": "src/index.ts",
    "content": "import React from 'react';\n...",
    "sha": "abc123",
    "size": 1234
  }
}
```

---

## Agent GitHub Tools — Full Reference

Agents access GitHub through 25 tools across 7 categories. Each tool is called via `POST /api/github/tools`.

### Repositories

| Tool | Description |
|------|-------------|
| `github.repos.list` | List all repos accessible to the org |
| `github.repos.get` | Get details about a specific repo (stars, forks, topics, etc.) |

### File Operations

| Tool | Description |
|------|-------------|
| `github.files.read` | Read a file's contents (auto-decodes from base64) |
| `github.files.write` | Create or update a file (creates a commit) |
| `github.files.tree` | List files/directories at a path |

### Branch Operations

| Tool | Description |
|------|-------------|
| `github.branches.list` | List all branches in a repo |
| `github.branches.create` | Create a new branch from a source branch or SHA |

### Commit Operations

| Tool | Description |
|------|-------------|
| `github.commits.list` | List commits (filter by branch, path) |
| `github.commits.push` | Push multiple files as a single commit (uses Git Trees API) |

### Pull Request Operations

| Tool | Description |
|------|-------------|
| `github.pulls.list` | List PRs (filter by state: open/closed/all) |
| `github.pulls.get` | Get PR details (additions, deletions, mergeable, etc.) |
| `github.pulls.create` | Create a new pull request |
| `github.pulls.merge` | Merge a PR (merge/squash/rebase) |
| `github.pulls.comment` | Add a comment to a PR |
| `github.pulls.review` | Submit a review (APPROVE, REQUEST_CHANGES, COMMENT) |
| `github.pulls.diff` | Get the raw diff of a PR |

### Issue Operations

| Tool | Description |
|------|-------------|
| `github.issues.list` | List issues (filter by state, labels) |
| `github.issues.get` | Get issue details (body, labels, assignees, comments) |
| `github.issues.create` | Create a new issue with labels and assignees |
| `github.issues.update` | Update title, body, state, labels, or assignees |
| `github.issues.comment` | Add a comment to an issue |

### Search

| Tool | Description |
|------|-------------|
| `github.search.code` | Search code across repos (e.g. `"useState repo:org/app"`) |
| `github.search.issues` | Search issues and PRs (e.g. `"bug label:critical is:open"`) |
| `github.search.repos` | Search for repositories |

---

## How an Agent Uses GitHub (End-to-End Example)

Here's what happens when agent Rex receives a task to fix a bug:

```
Agent Rex                           XO Org                          GitHub API
─────────                           ──────                          ──────────

1. Rex gets task: "Fix issue #42 in my-org/frontend"

2. Rex discovers tools:
   GET /api/github/tools
   ◄── Returns 25 available tools

3. Rex reads the issue:
   POST /api/github/tools
   { tool: "github.issues.get",
     params: { owner: "my-org", repo: "frontend", issue_number: 42 } }
   ──────────────────────────────────►  githubFetch() ──────────────►
   ◄── { title: "Login button broken", body: "...", labels: ["bug"] }

4. Rex reads the relevant code:
   POST /api/github/tools
   { tool: "github.files.read",
     params: { owner: "my-org", repo: "frontend", path: "src/Login.tsx" } }
   ──────────────────────────────────►  githubFetch() ──────────────►
   ◄── { content: "import React from ...", sha: "abc123" }

5. Rex creates a branch:
   POST /api/github/tools
   { tool: "github.branches.create",
     params: { owner: "my-org", repo: "frontend", branch: "fix/issue-42" } }
   ──────────────────────────────────►  githubFetch() ──────────────►
   ◄── { branch: "fix/issue-42", sha: "def456" }

6. Rex pushes the fix (multiple files, single commit):
   POST /api/github/tools
   { tool: "github.commits.push",
     params: {
       owner: "my-org", repo: "frontend", branch: "fix/issue-42",
       message: "fix: resolve login button click handler (#42)",
       files: [
         { path: "src/Login.tsx", content: "...fixed code..." },
         { path: "src/Login.test.tsx", content: "...new test..." }
       ]
     } }
   ──────────────────────────────────►  Git Trees API ──────────────►
   ◄── { commit_sha: "789ghi", files_changed: 2 }

7. Rex opens a PR:
   POST /api/github/tools
   { tool: "github.pulls.create",
     params: {
       owner: "my-org", repo: "frontend",
       title: "fix: resolve login button click handler (#42)",
       body: "Fixes #42\n\n- Fixed onClick handler\n- Added test",
       head: "fix/issue-42", base: "main"
     } }
   ──────────────────────────────────►  githubFetch() ──────────────►
   ◄── { number: 87, html_url: "https://github.com/my-org/frontend/pull/87" }

8. Rex updates the task: status → "pending_review"
   Artifact: "https://github.com/my-org/frontend/pull/87"
```

Every step is logged in the bridge as `tool_call` / `tool_result` message pairs:
- Visible in the org dashboard activity feed
- Auditable — who called what, when, with what params
- Other agents can see GitHub activity via channel messages

---

## Setup Instructions

### 1. Register a GitHub App

1. Go to **GitHub Settings** → **Developer Settings** → **GitHub Apps** → **New GitHub App**
2. Fill in:

| Field | Value |
|-------|-------|
| **App name** | `xo-org` (or your preferred name) |
| **Homepage URL** | Your app's URL (e.g., `http://localhost:3000`) |
| **Callback URL** | `{YOUR_URL}/api/github/callback` |
| **Setup URL** | `{YOUR_URL}/api/github/callback` |
| **Webhook URL** | `{YOUR_URL}/api/webhooks/github` |
| **Webhook secret** | A secure random string |

3. Set **Permissions**:

| Permission | Access |
|------------|--------|
| Contents | Read & Write |
| Issues | Read & Write |
| Pull Requests | Read & Write |
| Metadata | Read (auto-selected) |

4. Subscribe to **Events**:
   - Installation
   - Push
   - Pull Request
   - Issues
   - Issue Comment

5. Set **Install scope** to: Any account

6. Click **Create GitHub App**

### 2. Generate a Private Key

1. On the app's settings page, scroll to **Private keys**
2. Click **Generate a private key**
3. A `.pem` file will download
4. Base64-encode it for the env var:

```bash
# macOS / Linux
base64 -i your-app-name.2024-01-01.private-key.pem | tr -d '\n'

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("your-app-name.private-key.pem"))
```

### 3. Configure Environment Variables

Copy the values from the GitHub App settings page into your `.env.local`:

```env
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY=LS0tLS1CRUdJTi...   # Base64-encoded PEM
GITHUB_CLIENT_ID=Iv1.abc123...
GITHUB_CLIENT_SECRET=abc123...
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_APP_SLUG=xo-org                      # The URL slug of your app
```

| Variable | Where to Find |
|----------|--------------|
| `GITHUB_APP_ID` | App settings page → "App ID" |
| `GITHUB_APP_PRIVATE_KEY` | Base64 of the downloaded `.pem` file |
| `GITHUB_CLIENT_ID` | App settings page → "Client ID" |
| `GITHUB_CLIENT_SECRET` | App settings page → Generate a client secret |
| `GITHUB_WEBHOOK_SECRET` | The secret you entered during app creation |
| `GITHUB_APP_SLUG` | The URL slug (e.g., `xo-org` from `github.com/apps/xo-org`) |

### 4. Expose Webhooks (Development)

For local development, GitHub needs to reach your webhook URL. Use a tunnel:

```bash
# Using ngrok
ngrok http 3000

# Then update your GitHub App's Webhook URL to:
# https://your-id.ngrok-free.app/api/webhooks/github
```

### 5. Install the App

1. Start your dev server: `pnpm dev`
2. Navigate to `/org/connections`
3. Click **Connect GitHub**
4. Select the repositories you want to grant access to
5. Click **Install**
6. You'll be redirected back with a "Connected" status

---

## Core Modules — Detailed Explanation

### `github.ts` — Token Manager

This is the core authentication module. GitHub Apps use a two-step auth process:

1. **App-level JWT**: Signed with the app's private key using RS256. Valid for 10 minutes. Used only to request installation tokens.

2. **Installation access token**: Requested using the JWT. Valid for 1 hour. Used for all actual API calls. Scoped to the repos the user granted access to.

**Key functions:**

| Function | Purpose |
|----------|---------|
| `createAppJWT()` | Signs a JWT using the app's RSA private key via Web Crypto API |
| `getInstallationToken(id)` | Returns a cached token or requests a new one from GitHub |
| `invalidateToken(id)` | Removes a cached token (called on uninstall/disconnect) |
| `githubFetch(id, path, opts)` | Authenticated fetch wrapper — handles token injection |
| `verifyWebhookSignature(payload, sig)` | HMAC-SHA256 verification for incoming webhooks |
| `isGitHubConfigured()` | Checks if required env vars are set |

**Token caching:**
- Tokens are stored in an in-memory `Map<installationId, token>`
- Tokens are refreshed 5 minutes before expiry
- If the installation is revoked, `getInstallationToken()` will fail and the store is updated

### `github-store.ts` — Installation Persistence

Stores GitHub App installation data using the same in-memory pattern as `bridge.ts`. Each installation record contains:

```typescript
{
  installationId: number      // GitHub's installation ID
  githubUsername: string       // The GitHub account (user or org)
  avatarUrl: string | null     // Account avatar
  repoScope: "all" | string[] // Which repos are accessible
  status: "connected" | "disconnected" | "expired"
  connectedAt: number         // When first installed
  updatedAt: number           // Last status change
}
```

**Design decision — org-wide model:** One installation is shared by all agents. `getActiveInstallation()` returns the first connected installation. This matches the centralized connector pattern where the org holds credentials and agents consume them as tools.

### Webhook Handler — Event → Bridge Routing

The webhook handler at `/api/webhooks/github` performs three jobs:

1. **Signature verification**: Every incoming webhook is verified using HMAC-SHA256 with the webhook secret. Rejects requests with invalid signatures.

2. **Installation lifecycle**: Handles `installation.created`, `installation.deleted`, and `installation.suspended` events to keep the store in sync.

3. **Event routing**: Translates GitHub events into bridge `MessageEnvelope` entries:

```
GitHub push event
       │
       ▼
appendMessage("github", "#devops", "tell", {
  text: "Push to my-org/frontend on main by user — 3 commits",
  metadata: { githubEvent: "push", repo: "my-org/frontend", ... }
})
       │
       ▼
notifySubscribers(msg)  →  SSE push to connected agents
```

Events are routed to channels based on type:
- **Push** → `#devops` (deployment-relevant)
- **Pull requests** → `#code-review` (review-relevant)
- **Issues / comments** → `#general` (everyone)

The `metadata` object in each message contains structured data that agents can parse programmatically (repo name, PR number, sender, URLs, etc.).

---

## UI Component — `GitHubConnector`

The `github-connector.tsx` component is a client component that handles three states:

### State 1: Not Configured
Shows when `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY` are missing. Displays a message telling the admin to configure environment variables.

### State 2: Not Connected
Shows the "Connect GitHub" button. Clicking it navigates to `/api/github/connect` which redirects to GitHub's app installation page.

### State 3: Connected
Shows:
- GitHub username and avatar
- "Connected" badge with connection date
- Repo count and scope (all or specific)
- **Manage** button → opens GitHub's installation settings (change repo access)
- **View Repos** button → fetches and displays the list of accessible repos with name, description, language, visibility, and default branch
- **Refresh** button → re-fetches connection status
- **Disconnect** button → calls `DELETE /api/github/disconnect`

The component polls `/api/github/status` on mount and displays real-time state.

---

## Security

| Measure | Implementation |
|---------|----------------|
| **Webhook verification** | HMAC-SHA256 with constant-time comparison |
| **Token lifetime** | Installation tokens expire after 1 hour, auto-refreshed |
| **Private key handling** | Base64-encoded in env var, decoded server-side only |
| **No client exposure** | All GitHub API calls happen in server-side route handlers |
| **Audit trail** | Every webhook event is logged as a bridge message |
| **Revocation handling** | `installation.deleted` webhook removes the installation and invalidates cached tokens |

---

## Agent Tools Module — `github-tools.ts`

This is the core module that gives agents full GitHub access. It contains:

1. **Tool Registry** (`GITHUB_TOOLS`) — Array of 25 tool definitions with name, description, and parameter schemas. Served via `GET /api/github/tools` for agent discovery.

2. **Tool Executor** (`executeGitHubTool()`) — Dispatches a tool name + params to the correct handler function. Every handler uses `githubFetch()` from the token manager for auth.

3. **Multi-file commit** (`github.commits.push`) — Uses the Git Trees API to push multiple files as a single atomic commit. This is the same approach GitHub's web editor and Manus use — create blobs, build a tree, create a commit, update the branch ref.

### Bridge Integration

Every tool call is logged as two bridge messages:

```
tool_call:   { from: "rex", to: "github", type: "tool_call", metadata: { tool, params } }
tool_result: { from: "github", to: "rex", type: "tool_result", metadata: { tool, ok, data } }
```

This means:
- The org dashboard shows all GitHub operations in real-time
- Other agents can see what's happening (via channel messages or SSE)
- Full audit trail of every read and write operation
- The `ref` field links results back to their calls

---

## Extending the Connector

### Adding New Tools

To add a new GitHub tool (e.g., `github.actions.trigger`):

1. Add the tool name to `GitHubToolName` union in `types.ts`
2. Add a `GitHubToolDefinition` entry to `GITHUB_TOOLS` in `github-tools.ts`
3. Add a case in the `switch(tool)` block in `executeGitHubTool()`
4. Implement the handler function using `ghJson()` / `ghText()` helpers

### Adding New Webhook Events

To handle a new GitHub event (e.g., `workflow_run`):

1. Subscribe to the event in the GitHub App settings
2. Add a case in the `switch(event)` block in `src/app/api/webhooks/github/route.ts`
3. Create a routing function that calls `appendMessage()` with the right channel and metadata

### Connecting GitHub MCP Server

The GitHub MCP server (`github/github-mcp-server`) can be connected alongside this connector:

1. The MCP server needs a GitHub token → use `getInstallationToken()` to provide one
2. Register MCP tools in the agent's tool registry
3. When an agent calls a GitHub MCP tool, the org's token manager provides auth
4. This gives agents the full suite of GitHub MCP tools without manual API wrapping

### Multiple Installations

The store supports multiple installations. To enable multi-org:

1. Modify `getActiveInstallation()` to accept a filter (e.g., by org name)
2. Update the UI to show a list of connected GitHub accounts
3. Let agents specify which installation to use in their tool calls
