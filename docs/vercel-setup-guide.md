# Vercel Connector — Step-by-Step Setup Guide

This guide walks you through setting up the Vercel connector for XO Org from scratch. It covers creating a Vercel Integration, configuring OAuth, and verifying the connection.

> **Prerequisites**: Node.js 18+, pnpm, and a Vercel account.

---

## Table of Contents

1. [Create a Vercel Integration](#1-create-a-vercel-integration)
2. [Configure OAuth & Permissions](#2-configure-oauth--permissions)
3. [Get Your Credentials](#3-get-your-credentials)
4. [Configure Environment Variables](#4-configure-environment-variables)
5. [Start the Dev Server](#5-start-the-dev-server)
6. [Connect Vercel](#6-connect-vercel)
7. [Verify the Connection](#7-verify-the-connection)
8. [Troubleshooting](#8-troubleshooting)
9. [Environment Variable Reference](#9-environment-variable-reference)
10. [Available Vercel Tools](#10-available-vercel-tools)

---

## 1. Create a Vercel Integration

### Step 1.1 — Open the Integration Console

Go to: **https://vercel.com/dashboard/integrations/console**

Click **Create Integration** (or **Create** if you haven't created one before).

### Step 1.2 — Fill in Integration Details

| Field | Value |
|-------|-------|
| **Name** | `XO Org` (or any name) |
| **Description** | AI agent integration for managing Vercel deployments |
| **Logo** | _(optional)_ Upload an icon |

### Step 1.3 — Set Integration Type

Select **External Integration** (OAuth-based).

---

## 2. Configure OAuth & Permissions

### Step 2.1 — Set Redirect URL

Under the OAuth / Redirect URL section, add:

```
http://localhost:3000/api/vercel/callback
```

> **Note**: Unlike Slack, Vercel typically accepts `http://localhost` for development without issues.

### Step 2.2 — Set API Scopes

Configure the following permissions:

| Scope | Permission |
|-------|-----------|
| **Deployments** | Read & Write |
| **Projects** | Read & Write |
| **Project Environment Variables** | Read & Write |
| **Domains** | Read & Write |
| **Teams** | Read |
| **User** | Read |

These scopes enable agents to:
- List/create/cancel/promote deployments
- View project configurations
- Manage environment variables (keys only — values are masked for security)
- Add/remove custom domains

### Step 2.3 — Save / Create the Integration

Click **Create** or **Save** to finalize.

---

## 3. Get Your Credentials

After creating the integration, you'll see:

| Credential | Where to Find |
|------------|---------------|
| **Client ID** | Integration settings page (starts with `oac_`) |
| **Client Secret** | Integration settings page (click Show/Reveal) |
| **Integration Slug** | From the install URL: `vercel.com/integrations/{SLUG}/new` |

> **Finding the slug**: Look at the public install URL for your integration. If it's `https://vercel.com/integrations/xo-org/new`, the slug is `xo-org`.

---

## 4. Configure Environment Variables

Update your `.env.local` with the Vercel credentials:

```env
# ─── Vercel Integration ──────────────────────────────────────
VERCEL_CLIENT_ID=oac_xxxxxxxxxx
VERCEL_CLIENT_SECRET=your-client-secret
VERCEL_INTEGRATION_SLUG=xo-org
```

### Where to Find Each Value

| Variable | Location |
|----------|----------|
| `VERCEL_CLIENT_ID` | Integration Console → your integration → Client ID |
| `VERCEL_CLIENT_SECRET` | Integration Console → your integration → Client Secret |
| `VERCEL_INTEGRATION_SLUG` | The slug from your integration's install URL |

### Shared Dependencies

The Vercel connector requires `ENCRYPTION_KEY` for token encryption. If you've already set it up for Gmail or Slack, you're good — the same key is shared.

If not:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 5. Start the Dev Server

```bash
pnpm dev
```

Verify `.env.local` is listed under **Environments** in the startup output.

### Port Conflicts

If port 3000 is already in use:

**Windows:**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**macOS / Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

---

## 6. Connect Vercel

1. Open **http://localhost:3000/org/connections**
2. The Vercel card should show **"Connect Vercel"** — not "Not Configured"
3. Click **Connect Vercel**
4. Vercel's authorization page opens:
   - Select your personal account or team
   - Choose which projects to grant access to (all or specific)
   - Click **Install** / **Authorize**
5. You'll be redirected back with a "Connected" status

### What Happens Under the Hood

```
1. Browser → GET /api/vercel/connect
2. Server builds OAuth URL with CSRF state (random nonce)
3. Redirect → https://vercel.com/integrations/{SLUG}/new?state={encoded}
4. User selects account/team and approves
5. Vercel redirects → GET /api/vercel/callback?code=xxx&state=yyy
6. Server exchanges code → POST https://api.vercel.com/v2/oauth/access_token
7. Receives: access_token, installation_id, user_id, team_id
8. Server fetches user profile (username, email)
9. Encrypts token (AES-256-GCM) and stores connection
10. Redirect → /org/connections?vercel=connected
```

### Key Difference from Other Connectors

- Vercel access tokens **never expire** — no refresh flow needed (similar to Slack)
- If connected to a **team**, all API requests automatically include `?teamId={teamId}`
- Vercel has **no token revocation API** — to fully disconnect, the user must uninstall from the Vercel dashboard
- Environment variable values are **never exposed** in tool responses — only keys and targets are returned

---

## 7. Verify the Connection

### Check the UI

After connecting, the Vercel card should show:
- Vercel username
- "Connected" badge
- **Disconnect** button

### Check the API

```bash
# Connection status
curl http://localhost:3000/api/vercel/status

# Expected response:
# { "ok": true, "data": { "configured": true, "connected": true, "connection": { ... } } }

# List available tools
curl http://localhost:3000/api/vercel/tools

# Expected: 13 tools across projects, deployments, env vars, domains
```

### Test a Tool Call

```bash
# List projects
curl -X POST http://localhost:3000/api/vercel/tools \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "test", "tool": "vercel.projects.list", "params": {}}'

# List deployments
curl -X POST http://localhost:3000/api/vercel/tools \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "test", "tool": "vercel.deployments.list", "params": {}}'
```

---

## 8. Troubleshooting

### "Not Configured" — Vercel card shows env vars are missing

| Cause | Fix |
|-------|-----|
| `.env.local` missing Vercel vars | Add `VERCEL_CLIENT_ID` and `VERCEL_CLIENT_SECRET` |
| Server not restarted | Restart `pnpm dev` after editing `.env.local` |

### "Connect Vercel" redirects to a 404 page

| Cause | Fix |
|-------|-----|
| Wrong `VERCEL_INTEGRATION_SLUG` | Check the slug from your integration's install URL |
| Integration not yet published/created | Verify integration exists at https://vercel.com/dashboard/integrations/console |

### Callback fails after approving

| Cause | Fix |
|-------|-----|
| Wrong redirect URL | Ensure `http://localhost:3000/api/vercel/callback` is set in the integration console |
| Client ID or Secret is wrong | Re-check values from the integration settings page |
| `ENCRYPTION_KEY` is missing | Generate and add it to `.env.local` |

### API calls fail for team accounts

| Cause | Fix |
|-------|-----|
| Missing teamId | The code handles this automatically — ensure you selected the correct team during OAuth |
| Insufficient scopes | Verify all required scopes are enabled in the integration console |

### Cannot revoke access / fully disconnect

| Cause | Fix |
|-------|-----|
| Vercel has no revocation API | The "Disconnect" button removes local state only. To fully revoke, go to Vercel dashboard → Settings → Integrations → find the integration → Uninstall |

### Environment variable values not showing

| Cause | Fix |
|-------|-----|
| By design | `vercel.env.list` returns keys and targets only — values are never exposed for security. This is intentional. |

### Webhook events not arriving

| Cause | Fix |
|-------|-----|
| No webhook URL configured | Add a webhook URL in the integration console (requires HTTPS) |
| Using localhost | Use ngrok or similar tunnel for local dev: `npx ngrok http 3000` |
| Signature verification failing | Ensure `VERCEL_CLIENT_SECRET` is correct (used for HMAC-SHA256 verification) |

---

## 9. Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VERCEL_CLIENT_ID` | Yes | OAuth Client ID from integration console (starts with `oac_`) |
| `VERCEL_CLIENT_SECRET` | Yes | OAuth Client Secret from integration console |
| `VERCEL_INTEGRATION_SLUG` | Yes | URL slug of the integration (default: `xo-org`) |
| `VERCEL_REDIRECT_URI` | No | Defaults to `http://localhost:3000/api/vercel/callback` |
| `ENCRYPTION_KEY` | Yes | Shared 64-char hex key for AES-256-GCM token encryption |

### Security Notes

- **Never commit `.env.local`** — it's in `.gitignore`
- Vercel tokens **never expire** — they must be encrypted at rest (handled automatically)
- All Vercel API calls happen server-side — tokens never reach the browser
- Webhook events are verified using HMAC-SHA256 with the Client Secret
- Environment variable **values are never returned** by the `vercel.env.list` tool — only keys and targets
- OAuth flow includes CSRF protection via state parameter with random nonce

---

## 10. Available Vercel Tools (13 total)

### Projects
| Tool | Description |
|------|-------------|
| `vercel.projects.list` | List all projects with names, frameworks, latest deployment URLs, git repos |
| `vercel.projects.get` | Get detailed project info (build config, Node version, root directory) |

### Deployments
| Tool | Description |
|------|-------------|
| `vercel.deployments.list` | List recent deployments, filter by project or state (BUILDING/READY/ERROR) |
| `vercel.deployments.get` | Get deployment details (state, build logs, meta, regions) |
| `vercel.deployments.create` | Trigger a new deployment from a Git source (requires confirmation) |
| `vercel.deployments.cancel` | Cancel a building or queued deployment |
| `vercel.deployments.promote` | Promote a deployment to production / rollback (requires confirmation) |

### Environment Variables
| Tool | Description |
|------|-------------|
| `vercel.env.list` | List env vars (keys and targets only — values are masked) |
| `vercel.env.create` | Create a new environment variable (requires confirmation) |
| `vercel.env.delete` | Delete an environment variable by ID (requires confirmation) |

### Domains
| Tool | Description |
|------|-------------|
| `vercel.domains.list` | List custom domains on a project |
| `vercel.domains.add` | Attach a custom domain to a project (requires confirmation) |
| `vercel.domains.remove` | Remove a domain from a project (requires confirmation) |

> **Note**: Destructive tools (create deployment, promote, delete env, add/remove domain) require confirmation before execution for safety.

---

## Webhook Events (Optional)

If you configure a webhook URL in the integration console, Vercel sends deployment and project events:

| Event | Description |
|-------|-------------|
| `deployment.created` | New deployment started |
| `deployment.ready` | Deployment finished successfully |
| `deployment.error` | Deployment failed |
| `deployment.canceled` | Deployment was canceled |
| `project.created` | New project created |
| `project.removed` | Project deleted |
| `integration-configuration.removed` | Integration uninstalled from Vercel |

Events are routed to the `#devops` channel in the bridge for agent visibility.

For local development, webhooks require an HTTPS tunnel:
```bash
npx ngrok http 3000
# Use: https://your-id.ngrok-free.app/api/vercel/webhooks
```

---

## Quick Reference

```bash
# 1. Create integration at:
#    https://vercel.com/dashboard/integrations/console

# 2. Set redirect URL:
#    http://localhost:3000/api/vercel/callback

# 3. Set scopes: Deployments (R+W), Projects (R+W),
#    Env Vars (R+W), Domains (R+W), Teams (R), User (R)

# 4. Copy Client ID, Client Secret, and integration slug

# 5. Start dev server:
pnpm dev

# 6. Connect at:
#    http://localhost:3000/org/connections
```
