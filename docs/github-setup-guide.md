# GitHub Connector — Step-by-Step Setup Guide

This guide walks you through setting up the GitHub App connector for XO Org from scratch. It covers creating the GitHub App, configuring credentials, handling common issues, and verifying the connection.

> **Prerequisites**: Node.js 18+, pnpm, and a GitHub account.

---

## Table of Contents

1. [Create a GitHub App](#1-create-a-github-app)
2. [Generate a Private Key](#2-generate-a-private-key)
3. [Generate a Client Secret](#3-generate-a-client-secret)
4. [Configure Environment Variables](#4-configure-environment-variables)
5. [Set Up Webhooks (Local Development)](#5-set-up-webhooks-local-development)
6. [Start the Dev Server](#6-start-the-dev-server)
7. [Install the App](#7-install-the-app)
8. [Verify the Connection](#8-verify-the-connection)
9. [Troubleshooting](#9-troubleshooting)
10. [Environment Variable Reference](#10-environment-variable-reference)

---

## 1. Create a GitHub App

### Step 1.1 — Open the GitHub App Creation Page

Go to: **https://github.com/settings/apps/new**

Or navigate manually: **GitHub** → **Settings** → **Developer settings** → **GitHub Apps** → **New GitHub App**

### Step 1.2 — Fill In Basic Information

| Field | Value | Notes |
|-------|-------|-------|
| **GitHub App name** | `xo-org` (or your preferred name) | Must be globally unique across GitHub. If taken, try `xo-org-yourname` |
| **Description** | _(optional)_ | e.g., "XO Org — AI agent GitHub integration" |
| **Homepage URL** | `https://github.com/YOUR_USERNAME` | GitHub rejects `http://localhost:3000` — use your GitHub profile URL or repo URL instead |

> **Common issue**: GitHub validates that the Homepage URL is a publicly reachable URL. Using `http://localhost:3000` will fail with "Homepage URL must be a valid URL". Use your GitHub profile or repository URL.

### Step 1.3 — Configure Identifying and Authorizing Users

| Field | Value |
|-------|-------|
| **Callback URL** | `http://localhost:3000/api/github/callback` |
| **Setup URL** | `http://localhost:3000/api/github/callback` |

Leave other fields in this section at their defaults.

### Step 1.4 — Configure Webhooks

| Field | Value |
|-------|-------|
| **Active** | Checked _(or uncheck if you don't need real-time events yet)_ |
| **Webhook URL** | Your public tunnel URL (see [Section 5](#5-set-up-webhooks-local-development)) |
| **Webhook secret** | A secure random string (see below) |

> **Common issue**: GitHub rejects `http://localhost:3000/api/webhooks/github` because it's not reachable over the public internet. You have two options:
>
> - **Option A (Recommended for quick setup)**: Uncheck the **Active** checkbox to skip webhooks. The connector works without webhooks — you just won't receive real-time push/PR/issue notifications.
> - **Option B**: Set up a tunnel first (see [Section 5](#5-set-up-webhooks-local-development)) and use the tunnel URL.

**Generate a webhook secret** (run in your terminal):

```bash
# Bash / Git Bash
node -e "console.log(require('crypto').randomBytes(20).toString('hex'))"

# PowerShell
node -e "console.log(require('crypto').randomBytes(20).toString('hex'))"
```

Save this value — you'll need it for `.env.local`.

### Step 1.5 — Set Repository Permissions

Under **Permissions** → **Repository permissions**, set:

| Permission | Access Level |
|------------|-------------|
| **Contents** | Read & write |
| **Issues** | Read & write |
| **Metadata** | Read-only _(auto-selected)_ |
| **Pull requests** | Read & write |

Leave all other permissions as **No access**.

### Step 1.6 — Subscribe to Events

Under **Subscribe to events**, check:

- [x] **Installation**
- [x] **Issues**
- [x] **Issue comment**
- [x] **Pull request**
- [x] **Push**

### Step 1.7 — Set Install Scope

Under **Where can this GitHub App be installed?**, select:

- **Any account** _(recommended — allows installation on personal accounts and orgs)_

### Step 1.8 — Create the App

Click **Create GitHub App**.

You'll be redirected to your app's settings page. Note the following values displayed on this page — you'll need them in Step 4:

- **App ID** — a number like `3292498`
- **Client ID** — starts with `Iv1.` or `Iv23.`
- **Public link** — e.g., `https://github.com/apps/xo-org-adapter` (the slug is the last part: `xo-org-adapter`)

---

## 2. Generate a Private Key

GitHub Apps authenticate using a RSA private key to sign JWTs.

1. On your app's settings page, scroll down to the **Private keys** section
2. Click **Generate a private key**
3. A `.pem` file will automatically download (e.g., `xo-org-adapter.2026-04-06.private-key.pem`)
4. **Keep this file safe** — you cannot download it again. If lost, you must generate a new key.

### Base64-Encode the Private Key

XO Org expects the private key as a base64-encoded string (to avoid newline issues in `.env` files).

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\YourName\Downloads\xo-org-adapter.2026-04-06.private-key.pem"))
```

**macOS / Linux:**
```bash
base64 -i xo-org-adapter.2026-04-06.private-key.pem | tr -d '\n'
```

**Git Bash on Windows:**
```bash
base64 -w 0 < xo-org-adapter.2026-04-06.private-key.pem
```

Copy the output — this is your `GITHUB_APP_PRIVATE_KEY` value.

> **Security**: After copying the base64 value, move the `.pem` file out of your project directory to avoid accidentally committing it. The `.pem` file should NEVER be checked into version control.

---

## 3. Generate a Client Secret

1. On your app's settings page, scroll to **Client secrets**
2. Click **Generate a new client secret**
3. **Copy the secret immediately** — GitHub only shows it once
4. Save it — this is your `GITHUB_CLIENT_SECRET` value

---

## 4. Configure Environment Variables

Create a `.env.local` file in the project root (if it doesn't exist):

```bash
cp .env.example .env.local
```

Fill in the GitHub section with the values you collected:

```env
# ─── GitHub App ──────────────────────────────────────────────
GITHUB_APP_ID=3292498                            # App settings → "App ID"
GITHUB_APP_PRIVATE_KEY=LS0tLS1CRUdJTi...         # Base64-encoded PEM from Step 2
GITHUB_CLIENT_ID=Iv23liHhq8iwwrb8rZmh            # App settings → "Client ID"
GITHUB_CLIENT_SECRET=d0dc67140872c7da...          # Client secret from Step 3
GITHUB_WEBHOOK_SECRET=a1b2c3d4e5f6...             # Webhook secret from Step 1.4
GITHUB_APP_SLUG=xo-org-adapter                    # The slug from the public link URL
```

### Where to Find Each Value

| Variable | Location |
|----------|----------|
| `GITHUB_APP_ID` | App settings page → **About** section → "App ID" (a number) |
| `GITHUB_APP_PRIVATE_KEY` | Base64-encoded content of the downloaded `.pem` file |
| `GITHUB_CLIENT_ID` | App settings page → **About** section → "Client ID" (starts with `Iv`) |
| `GITHUB_CLIENT_SECRET` | Generated in **Client secrets** section (only shown once) |
| `GITHUB_WEBHOOK_SECRET` | The random string you entered as the webhook secret |
| `GITHUB_APP_SLUG` | The last part of the public link URL (e.g., `xo-org-adapter` from `github.com/apps/xo-org-adapter`) |

> **Important**: The `GITHUB_APP_SLUG` must exactly match your app's URL slug. If the public link is `https://github.com/apps/xo-org-adapter`, the slug is `xo-org-adapter`. An incorrect slug will cause the "Connect GitHub" button to redirect to a 404 page.

---

## 5. Set Up Webhooks (Local Development)

GitHub needs to reach your webhook endpoint over the public internet. For local development, use a tunneling service.

> **Skip this step** if you unchecked "Active" in the webhook settings. You can always enable webhooks later.

### Option A — ngrok (Recommended)

1. Install ngrok: https://ngrok.com/download (or `npm install -g ngrok`)

2. Sign up for a free account at https://ngrok.com and get your auth token

3. Configure ngrok:
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

4. Start the tunnel:
   ```bash
   ngrok http 3000
   ```

5. Copy the HTTPS forwarding URL (e.g., `https://abc123.ngrok-free.app`)

6. Update your GitHub App's **Webhook URL** to:
   ```
   https://abc123.ngrok-free.app/api/webhooks/github
   ```

### Option B — Use `npx` Without Installing

```bash
npx ngrok http 3000
```

### Important Notes

- The ngrok URL changes every time you restart ngrok (on the free plan). You'll need to update the Webhook URL in your GitHub App settings each time.
- Keep the ngrok terminal running while developing — if you stop it, GitHub webhook deliveries will fail (and GitHub will retry them).
- On the ngrok free plan, you may see an interstitial warning page. This doesn't affect webhooks (only browser requests).

---

## 6. Start the Dev Server

```bash
pnpm dev
```

You should see:

```
▲ Next.js 16.x.x (Turbopack)
- Local:        http://localhost:3000
- Environments: .env.local
✓ Ready
```

Confirm `.env.local` is listed under **Environments** — this means your environment variables are loaded.

### Port Conflicts

If port 3000 is already in use:

**Windows (PowerShell or Command Prompt):**
```powershell
# Find the process using port 3000
netstat -ano | findstr :3000

# Kill it (replace PID with the actual number)
taskkill /PID <PID> /F
```

**macOS / Linux:**
```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9
```

Then run `pnpm dev` again.

---

## 7. Install the App

1. Open **http://localhost:3000/org/connections** in your browser
2. The GitHub card should show **"Connect GitHub"** (green button) — not "Not Configured"
3. Click **Connect GitHub**
4. You'll be redirected to GitHub's app installation page
5. Select the account where you want to install the app
6. Choose **All repositories** or select specific repositories
7. Click **Install**
8. GitHub redirects you back to the connections page with a "Connected" status

### What Happens Under the Hood

```
1. Browser → GET /api/github/connect
2. Server redirects → https://github.com/apps/xo-org-adapter/installations/new
3. User installs app on GitHub
4. GitHub redirects → GET /api/github/callback?installation_id=123&setup_action=install
5. Server fetches account info using the installation token
6. Server stores the installation in memory
7. Server redirects → /org/connections?github=connected
8. UI shows "Connected" with GitHub username, avatar, and repo count
```

---

## 8. Verify the Connection

### Check the UI

After installation, the GitHub connector card should show:

- GitHub username and avatar
- "Connected" badge
- Number of accessible repositories
- **Manage** / **View Repos** / **Refresh** / **Disconnect** buttons

### Check the API

```bash
# Connection status
curl http://localhost:3000/api/github/status

# Expected response:
# { "ok": true, "data": { "configured": true, "connected": true, "installation": { ... } } }

# List accessible repos
curl http://localhost:3000/api/github/repos

# Available tools
curl http://localhost:3000/api/github/tools
```

### Test a Tool Call

```bash
curl -X POST http://localhost:3000/api/github/tools \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "test", "tool": "github.repos.list", "params": {}}'
```

---

## 9. Troubleshooting

### "Not Configured" — GitHub card shows env vars are missing

| Cause | Fix |
|-------|-----|
| `.env.local` doesn't exist | Create it: `cp .env.example .env.local` |
| `GITHUB_APP_ID` is empty | Copy the App ID from your GitHub App settings |
| `GITHUB_APP_PRIVATE_KEY` is empty | Base64-encode the `.pem` file and paste the value |
| Server not restarted | Stop and restart `pnpm dev` after editing `.env.local` |

### "Connect GitHub" redirects to a 404 page

| Cause | Fix |
|-------|-----|
| Wrong `GITHUB_APP_SLUG` | Check the public link URL on your app settings page. The slug is the last segment (e.g., `xo-org-adapter` from `github.com/apps/xo-org-adapter`) |
| App was deleted or renamed | Verify the app still exists at `https://github.com/settings/apps` |

### Callback fails after installing the app

| Cause | Fix |
|-------|-----|
| Wrong Callback URL | Update the Callback URL in GitHub App settings to `http://localhost:3000/api/github/callback` |
| `GITHUB_APP_PRIVATE_KEY` is malformed | Re-encode the `.pem` file. Ensure no extra whitespace or line breaks in the env var |
| `.pem` file was corrupted | Generate a new private key from the GitHub App settings |

### Webhooks not arriving

| Cause | Fix |
|-------|-----|
| Webhooks are disabled | Enable "Active" in your app's webhook settings |
| Using localhost URL | GitHub can't reach localhost. Set up a tunnel (see [Section 5](#5-set-up-webhooks-local-development)) |
| ngrok stopped | Restart ngrok and update the Webhook URL in GitHub |
| Wrong webhook secret | Ensure `GITHUB_WEBHOOK_SECRET` in `.env.local` matches the secret in GitHub App settings |

### Port 3000 already in use

See [Port Conflicts](#port-conflicts) in Section 6.

### "Homepage URL must be a valid URL"

GitHub requires a publicly accessible URL for the Homepage field. Use your GitHub profile URL (e.g., `https://github.com/YOUR_USERNAME`) instead of `http://localhost:3000`.

### Private key errors ("Failed to get installation token")

| Cause | Fix |
|-------|-----|
| Key not base64-encoded | Run the base64 encoding command from [Step 2](#base64-encode-the-private-key) |
| Wrong key format | Ensure the `.pem` file starts with `-----BEGIN RSA PRIVATE KEY-----` |
| Key was revoked | Generate a new private key from the GitHub App settings page |
| Wrong App ID + key combination | Verify `GITHUB_APP_ID` matches the app the key was generated for |

---

## 10. Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_APP_ID` | Yes | Numeric App ID from GitHub App settings |
| `GITHUB_APP_PRIVATE_KEY` | Yes | Base64-encoded RSA private key (`.pem` file content) |
| `GITHUB_CLIENT_ID` | Yes | OAuth Client ID (starts with `Iv1.` or `Iv23.`) |
| `GITHUB_CLIENT_SECRET` | Yes | OAuth Client Secret (generated, shown once) |
| `GITHUB_WEBHOOK_SECRET` | Yes | Shared secret for webhook signature verification |
| `GITHUB_APP_SLUG` | No | URL slug of the GitHub App (defaults to `xo-org`). Must match the slug in your app's public link |

### Security Notes

- **Never commit `.env.local`** — it's already in `.gitignore`
- **Never commit `.pem` files** — move them out of the project directory after encoding
- All GitHub API calls happen server-side only — tokens are never exposed to the browser
- Installation tokens expire after 1 hour and are automatically refreshed
- The private key is only used to sign JWTs — it never leaves the server

---

## Quick Reference

```bash
# 1. Create GitHub App at:
#    https://github.com/settings/apps/new

# 2. Base64-encode private key (PowerShell):
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\key.pem"))

# 3. Base64-encode private key (Bash):
base64 -w 0 < path/to/key.pem

# 4. Generate webhook secret:
node -e "console.log(require('crypto').randomBytes(20).toString('hex'))"

# 5. Start tunnel for webhooks:
npx ngrok http 3000

# 6. Start dev server:
pnpm dev

# 7. Connect at:
#    http://localhost:3000/org/connections
```
