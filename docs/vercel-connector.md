# Vercel Connector — Documentation

## Overview

The Vercel connector integrates XO Org with Vercel using a **Vercel Integration with OAuth 2.0**. Once connected, agents can list projects, trigger deployments, manage environment variables, configure domains, and roll back deployments — all on behalf of the connected Vercel account or team.

Key characteristics:
- Vercel access tokens are **long-lived and do not expire** — no refresh flow needed
- If connected to a **team**, `?teamId={id}` must be appended to every API request
- Vercel calls their OAuth apps "Integrations" — created via the Integration Console

---

## Architecture

### Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                           XO Org                                  │
│                                                                   │
│  ┌──────────┐    ┌────────────────┐    ┌───────────────┐         │
│  │  Bridge   │◄──│ Webhook Handler│◄───│ Vercel        │         │
│  │ (events)  │   │ /api/vercel/   │    │ Webhooks      │         │
│  │           │   │ webhooks       │    │ (deploy,      │         │
│  └─────┬─────┘   └────────────────┘    │  project,     │         │
│        │                                │  uninstall)   │         │
│  ┌─────▼─────┐   ┌────────────────┐    └───────────────┘         │
│  │  Agents   │──►│ Vercel Tools   │                              │
│  │           │   │ /api/vercel/   │    ┌───────────────┐         │
│  └───────────┘   │ tools          │───►│ Vercel REST   │         │
│                  └───────┬────────┘    │ API           │         │
│                          │             │ + teamId      │         │
│  ┌────────────┐   ┌──────▼────────┐    └───────────────┘         │
│  │ Vercel     │   │ Access Token  │                              │
│  │ Store      │   │ (AES-GCM      │                              │
│  │ (encrypted)│   │  encrypted)   │                              │
│  └────────────┘   └───────────────┘                              │
└──────────────────────────────────────────────────────────────────┘
```

### OAuth Flow

```
User                     Vercel Integration          XO Org
────                     ──────────────────          ──────

1. Click "Connect Vercel"
   → GET /api/vercel/connect
   → Redirect to vercel.com/integrations/{slug}/new

2. User selects account/team, grants access to projects

3. Vercel redirects to callback
   → GET /api/vercel/callback?code=xxx&state=yyy

4. Exchange code for token
   → POST api.vercel.com/v2/oauth/access_token
   ← access_token, team_id, installation_id

5. Fetch user profile
   → GET api.vercel.com/v2/user
   ← username, email

6. Encrypt & store, redirect back
```

---

## File Structure

```
src/app/api/
├── lib/
│   ├── types.ts              # VercelConnection, VercelToolName, etc.
│   ├── vercel.ts             # OAuth flow, vercelFetch (auto teamId), webhook verification
│   ├── vercel-store.ts       # Connection persistence, token decryption
│   └── vercel-tools.ts       # Tool registry + all 13 tool implementations
├── vercel/
│   ├── connect/route.ts      # GET  — Redirect to Vercel OAuth
│   ├── callback/route.ts     # GET  — Handle OAuth callback
│   ├── status/route.ts       # GET  — Connection status
│   ├── disconnect/route.ts   # DELETE — Remove connection
│   ├── webhooks/route.ts     # POST — Webhook events (deployments, projects, uninstall)
│   └── tools/route.ts        # GET  — Tool discovery | POST — Execute tool

src/components/xo/
└── vercel-connector.tsx      # Client component — connect/status/disconnect UI
```

---

## Agent Vercel Tools — Full Reference

13 tools across 4 categories via `POST /api/vercel/tools`.

### Projects

| Tool | Description |
|------|-------------|
| `vercel.projects.list` | List all projects (name, framework, latest URL, Git repo) |
| `vercel.projects.get` | Get project details (build config, node version, root dir) |

### Deployments

| Tool | Description |
|------|-------------|
| `vercel.deployments.list` | List recent deployments (filter by project, state) |
| `vercel.deployments.get` | Get deployment details (state, build logs, meta, regions) |
| `vercel.deployments.create` | Trigger a new deployment from Git source |
| `vercel.deployments.cancel` | Cancel a building/queued deployment |
| `vercel.deployments.promote` | Promote a deployment to production (rollback) |

### Environment Variables

| Tool | Description |
|------|-------------|
| `vercel.env.list` | List env vars (keys & targets only — values masked for security) |
| `vercel.env.create` | Create env var (key, value, targets, type: plain/encrypted/secret) |
| `vercel.env.delete` | Delete an env var by ID |

### Domains

| Tool | Description |
|------|-------------|
| `vercel.domains.list` | List custom domains on a project |
| `vercel.domains.add` | Attach a custom domain to a project |
| `vercel.domains.remove` | Remove a domain from a project |

---

## How an Agent Uses Vercel (End-to-End Example)

```
Agent Rex                           XO Org                         Vercel API
─────────                           ──────                         ──────────

1. Rex gets task: "Deploy the latest main branch and check status"

2. Rex lists projects:
   { tool: "vercel.projects.list", params: {} }
   ◄── { projects: [{ id: "prj_abc", name: "frontend", framework: "nextjs" }] }

3. Rex triggers a deployment:
   { tool: "vercel.deployments.create",
     params: {
       name: "frontend",
       gitSource: { repo: "org/frontend", ref: "main", type: "github" }
     } }
   ◄── { id: "dpl_xyz", url: "frontend-abc.vercel.app", state: "BUILDING" }

4. Rex checks deployment status:
   { tool: "vercel.deployments.get", params: { id: "dpl_xyz" } }
   ◄── { state: "READY", url: "frontend-abc.vercel.app" }

5. If something goes wrong, Rex rolls back:
   { tool: "vercel.deployments.promote",
     params: { projectId: "prj_abc", deploymentId: "dpl_previous" } }
   ◄── { jobId: "job_123", status: "succeeded" }
```

---

## Setup Instructions

### 1. Create a Vercel Integration

1. Go to **https://vercel.com/dashboard/integrations/console**
2. Click **Create Integration**
3. Fill in name, description, and logo
4. Set **Redirect URL**: `http://localhost:3000/api/vercel/callback`
5. Select **API Scopes**:
   - Deployments: Read & Write
   - Projects: Read & Write
   - Project Environment Variables: Read & Write
   - Domains: Read & Write
   - Teams: Read
   - User: Read

### 2. Get Credentials

From the integration settings page, copy:
- **Client ID**
- **Client Secret**
- **Integration slug** (from the install URL)

### 3. Configure Webhooks (Optional)

Set the webhook endpoint URL in the integration settings to receive deployment and project events.

### 4. Configure Environment Variables

```env
VERCEL_CLIENT_ID=oac_...
VERCEL_CLIENT_SECRET=...
VERCEL_INTEGRATION_SLUG=xo-org
ENCRYPTION_KEY=your-64-char-hex-key
```

### 5. Connect

1. `pnpm dev`
2. Navigate to `/org/connections`
3. Click **Connect Vercel**
4. Select account/team and approve
5. Connected!

---

## Webhook Events

| Event | Action |
|-------|--------|
| `deployment.created` | Route to `#devops` — "Deployment started" |
| `deployment.ready` | Route to `#devops` — "Deployment ready" |
| `deployment.error` | Route to `#devops` — "Deployment failed" |
| `deployment.canceled` | Route to `#devops` — "Deployment canceled" |
| `project.created` | Route to `#devops` — "Project created" |
| `project.removed` | Route to `#devops` — "Project removed" |
| `integration-configuration.removed` | Mark connection as "uninstalled" |

---

## Security

| Measure | Implementation |
|---------|----------------|
| **Token encryption** | AES-256-GCM for stored access tokens |
| **Webhook verification** | HMAC-SHA256 with Client Secret |
| **CSRF protection** | `state` parameter with random nonce |
| **Env var masking** | `vercel.env.list` returns keys only — values never exposed |
| **Server-side only** | All API calls in server-side route handlers |
| **Audit logging** | Every tool call/result logged in bridge |

### High-Impact Actions Requiring Confirmation

Agents should confirm with the user before:
- Triggering deployments (`vercel.deployments.create`)
- Modifying environment variables (`vercel.env.create`, `vercel.env.delete`)
- Changing domain configuration (`vercel.domains.add`, `vercel.domains.remove`)
- Promoting/rolling back deployments (`vercel.deployments.promote`)

---

## All Connectors Summary

| Connector | Auth | Tools | Real-time | Docs |
|-----------|------|-------|-----------|------|
| **GitHub** | GitHub App (JWT) | 25 tools | Webhooks | [github-connector.md](github-connector.md) |
| **Gmail** | OAuth 2.0 + refresh | 11 tools | — | [gmail-connector.md](gmail-connector.md) |
| **Slack** | OAuth v2 + Events API | 10 tools | @mentions + DMs | [slack-connector.md](slack-connector.md) |
| **Stripe** | Connect OAuth | 13 tools | Webhooks | [stripe-connector.md](stripe-connector.md) |
| **Vercel** | Integration OAuth | 13 tools | Webhooks | [vercel-connector.md](vercel-connector.md) |
| **Total** | | **72 tools** | | |
