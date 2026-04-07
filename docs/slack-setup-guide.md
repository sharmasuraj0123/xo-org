# Slack Connector — Step-by-Step Setup Guide

This guide walks you through setting up the Slack connector for XO Org from scratch. It covers creating a Slack App, configuring OAuth scopes, handling events, and verifying the connection.

> **Prerequisites**: Node.js 18+, pnpm, a Slack account, and a Slack workspace where you have admin access.

---

## Table of Contents

1. [Create a Slack App](#1-create-a-slack-app)
2. [Configure OAuth & Permissions](#2-configure-oauth--permissions)
3. [Configure Event Subscriptions](#3-configure-event-subscriptions-optional)
4. [Get Your Credentials](#4-get-your-credentials)
5. [Configure Environment Variables](#5-configure-environment-variables)
6. [Start the Dev Server](#6-start-the-dev-server)
7. [Connect Slack](#7-connect-slack)
8. [Verify the Connection](#8-verify-the-connection)
9. [Troubleshooting](#9-troubleshooting)
10. [Environment Variable Reference](#10-environment-variable-reference)
11. [Available Slack Tools](#11-available-slack-tools)

---

## 1. Create a Slack App

### Step 1.1 — Open the App Creation Page

Go to: **https://api.slack.com/apps**

Click **Create New App** → **From scratch**

### Step 1.2 — Fill in App Details

| Field | Value |
|-------|-------|
| **App Name** | `XO Org` (or any name) |
| **Pick a workspace** | Select your development workspace |

Click **Create App**

You'll be taken to the app's **Basic Information** page.

---

## 2. Configure OAuth & Permissions

### Step 2.1 — Add Redirect URL

1. In the left sidebar, click **OAuth & Permissions**
2. Scroll to **Redirect URLs**
3. Click **Add New Redirect URL**
4. Enter exactly:
   ```
   http://localhost:3000/api/slack/callback
   ```
5. Click **Add** → **Save URLs**

> **Important**: The redirect URL must match exactly — including protocol (`http`), port (`3000`), and path. No trailing slash.

### Step 2.2 — Add Bot Token Scopes

Scroll down to **Scopes** → **Bot Token Scopes** → Click **Add an OAuth Scope** for each:

| Scope | Purpose |
|-------|---------|
| `channels:read` | List public channels |
| `channels:history` | Read public channel messages |
| `channels:join` | Join public channels |
| `groups:read` | List private channels |
| `groups:history` | Read private channel messages |
| `chat:write` | Send messages and replies |
| `users:read` | List workspace members |
| `users:read.email` | Get user email addresses |
| `im:read` | List DMs |
| `im:history` | Read DM history |
| `mpim:read` | List group DMs |
| `mpim:history` | Read group DM history |
| `reactions:read` | View message reactions |
| `reactions:write` | Add emoji reactions |
| `files:read` | Access shared files |
| `files:write` | Upload files |
| `app_mentions:read` | Receive @mention events |

### Step 2.3 — Add User Token Scope (Optional, for Search)

Under **User Token Scopes**, click **Add an OAuth Scope** and add:

| Scope | Purpose |
|-------|---------|
| `search:read` | Search messages across the workspace |

> **Note**: If you skip this, the `slack.search.messages` tool won't work, but all other tools will function normally.

---

## 3. Configure Event Subscriptions (Optional)

Event subscriptions allow XO Org to receive real-time notifications when the bot is @mentioned or receives DMs. **Skip this section** if you don't need real-time events.

### Step 3.1 — Set Up a Tunnel (Required for Local Dev)

Slack requires an HTTPS endpoint for events. For local development:

```bash
npx ngrok http 3000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`).

### Step 3.2 — Enable Events

1. In the left sidebar, click **Event Subscriptions**
2. Toggle **Enable Events** to **On**
3. In **Request URL**, enter:
   ```
   https://abc123.ngrok-free.app/api/slack/events
   ```
   > Slack will send a verification challenge — your server must be running to respond. Start `pnpm dev` first if needed.

4. Click **Save Changes** after verification succeeds

### Step 3.3 — Subscribe to Bot Events

Under **Subscribe to bot events**, click **Add Bot User Event** for each:

| Event | Description |
|-------|-------------|
| `app_mention` | When someone @mentions the bot |
| `message.channels` | Messages in channels the bot is in |
| `message.im` | Direct messages to the bot |

Click **Save Changes**

> **Gotcha**: The ngrok URL changes every restart (free plan). You'll need to update the Request URL each time. Consider ngrok's paid plan for a stable URL, or skip events for local dev.

---

## 4. Get Your Credentials

1. In the left sidebar, click **Basic Information**
2. Scroll to **App Credentials**
3. Copy these three values:

| Credential | Where |
|------------|-------|
| **Client ID** | App Credentials section |
| **Client Secret** | Click **Show** to reveal, then copy |
| **Signing Secret** | Click **Show** to reveal, then copy |

> **Signing Secret** is used to verify that incoming webhooks/events are genuinely from Slack (HMAC-SHA256 signature verification).

---

## 5. Configure Environment Variables

Update your `.env.local` file with the Slack credentials:

```env
# ─── Slack App ───────────────────────────────────────────────
SLACK_CLIENT_ID=1234567890.1234567890123
SLACK_CLIENT_SECRET=abcdef1234567890abcdef1234567890
SLACK_SIGNING_SECRET=abcdef1234567890abcdef1234567890
```

### Where to Find Each Value

| Variable | Location |
|----------|----------|
| `SLACK_CLIENT_ID` | Basic Information → App Credentials → "Client ID" |
| `SLACK_CLIENT_SECRET` | Basic Information → App Credentials → "Client Secret" (click Show) |
| `SLACK_SIGNING_SECRET` | Basic Information → App Credentials → "Signing Secret" (click Show) |

### Shared Dependencies

The Slack connector also requires `ENCRYPTION_KEY` for token encryption. If you've already set it up for Gmail, you're good — the same key is shared across all connectors.

If not:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add to `.env.local`:
```env
ENCRYPTION_KEY=your-64-char-hex-key
```

---

## 6. Start the Dev Server

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

## 7. Connect Slack

1. Open **http://localhost:3000/org/connections**
2. The Slack card should show **"Add to Slack"** — not "Not Configured"
3. Click **Add to Slack**
4. Slack's consent page opens:
   - Select the workspace to install to
   - Review the requested permissions
   - Click **Allow**
5. You'll be redirected back with a "Connected" status

### What Happens Under the Hood

```
1. Browser → GET /api/slack/connect
2. Server builds OAuth URL with bot + user scopes + CSRF state
3. Redirect → https://slack.com/oauth/v2/authorize?...
4. User approves in Slack's consent screen
5. Slack redirects → GET /api/slack/callback?code=xxx&state=yyy
6. Server exchanges code → POST https://slack.com/api/oauth.v2.access
7. Receives: bot token, bot user ID, team ID, team name
8. Server encrypts tokens (AES-256-GCM) and stores connection
9. Redirect → /org/connections?slack=connected
10. UI shows "Connected" with workspace name
```

### Key Difference from GitHub/Gmail

Slack bot tokens **never expire**. There's no refresh flow — the token stays valid until the app is uninstalled or access is revoked by a workspace admin. Tokens are still encrypted at rest for security.

---

## 8. Verify the Connection

### Check the UI

After connecting, the Slack card should show:
- Workspace name
- "Connected" badge
- **Disconnect** button

### Check the API

```bash
# Connection status
curl http://localhost:3000/api/slack/status

# Expected response:
# { "ok": true, "data": { "configured": true, "connected": true, "connection": { ... } } }

# List available tools
curl http://localhost:3000/api/slack/tools

# Expected: 10 tools across channels, messages, users, search, files
```

### Test a Tool Call

```bash
# List channels
curl -X POST http://localhost:3000/api/slack/tools \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "test", "tool": "slack.channels.list", "params": {}}'

# List workspace members
curl -X POST http://localhost:3000/api/slack/tools \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "test", "tool": "slack.users.list", "params": {}}'

# Send a test message (replace CHANNEL_ID)
curl -X POST http://localhost:3000/api/slack/tools \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "test", "tool": "slack.messages.send", "params": {"channel": "CHANNEL_ID", "text": "Hello from XO Org!"}}'
```

---

## 9. Troubleshooting

### "Not Configured" — Slack card shows env vars are missing

| Cause | Fix |
|-------|-----|
| `.env.local` missing Slack vars | Add `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET` |
| Server not restarted | Restart `pnpm dev` after editing `.env.local` |

### "Add to Slack" redirects but fails

| Cause | Fix |
|-------|-----|
| Wrong redirect URL | Ensure `http://localhost:3000/api/slack/callback` is listed in OAuth & Permissions → Redirect URLs |
| Missing scopes | Add all required bot token scopes (see [Step 2.2](#step-22--add-bot-token-scopes)) |
| `SLACK_CLIENT_ID` or `SLACK_CLIENT_SECRET` is wrong | Re-check values in Basic Information → App Credentials |

### "invalid_code" error on callback

| Cause | Fix |
|-------|-----|
| Code expired | Authorization codes expire quickly. Try the flow again. |
| Client ID/Secret mismatch | Verify both values match your Slack app |

### Events not arriving

| Cause | Fix |
|-------|-----|
| Events not enabled | Enable Event Subscriptions in your Slack app settings |
| Request URL not verified | Slack needs to verify the endpoint. Ensure your server is running with a valid HTTPS URL |
| ngrok stopped | Restart ngrok and update the Request URL |
| Bot not in channel | The bot must be in the channel to receive events. Use `slack.channels.join` or invite it manually |

### Search tool returns error

| Cause | Fix |
|-------|-----|
| Missing user token | The user must have approved `search:read` scope during OAuth. Disconnect and reconnect. |
| `search:read` not in scopes | Add it under User Token Scopes in OAuth & Permissions |

### Bot messages loop / duplicate messages

| Cause | Fix |
|-------|-----|
| Bot replying to itself | Built-in protection ignores messages from bot's own user ID |
| Slack retrying events | Events are deduplicated by `event_id` (last 1000 events tracked) |
| Multiple server instances | For production, use Redis/database for deduplication instead of in-memory Set |

### `ENCRYPTION_KEY` errors

| Cause | Fix |
|-------|-----|
| Key not set | Add `ENCRYPTION_KEY` to `.env.local` (see [Gmail setup](#shared-dependencies)) |
| Key changed after connection | All tokens become invalid. Users must reconnect. |

---

## 10. Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_CLIENT_ID` | Yes | OAuth Client ID from Slack app's Basic Information |
| `SLACK_CLIENT_SECRET` | Yes | OAuth Client Secret from Slack app's Basic Information |
| `SLACK_SIGNING_SECRET` | Yes | Webhook signing secret for HMAC-SHA256 verification |
| `SLACK_REDIRECT_URI` | No | Defaults to `http://localhost:3000/api/slack/callback` |
| `ENCRYPTION_KEY` | Yes | Shared 64-char hex key for AES-256-GCM token encryption |

### Security Notes

- **Never commit `.env.local`** — it's in `.gitignore`
- Slack bot tokens **never expire** — they must be encrypted at rest (handled automatically)
- All Slack API calls happen server-side — tokens never reach the browser
- Webhook events are verified using HMAC-SHA256 with the signing secret
- Events older than 5 minutes are rejected (replay attack protection)
- OAuth flow includes CSRF protection via state parameter with random nonce

---

## 11. Available Slack Tools (10 total)

### Channels
| Tool | Description |
|------|-------------|
| `slack.channels.list` | List channels (public, private, DMs, group DMs) with pagination |
| `slack.channels.history` | Read message history with optional time range filtering |
| `slack.channels.join` | Join a public channel |

### Threads
| Tool | Description |
|------|-------------|
| `slack.threads.replies` | Read all replies in a thread |

### Messages
| Tool | Description |
|------|-------------|
| `slack.messages.send` | Send a message or thread reply (supports Block Kit for rich formatting) |
| `slack.messages.react` | Add an emoji reaction to a message |

### Users
| Tool | Description |
|------|-------------|
| `slack.users.list` | List all workspace members |
| `slack.users.info` | Get detailed info about a specific user |

### Search
| Tool | Description |
|------|-------------|
| `slack.search.messages` | Search messages across workspace (requires user token with `search:read` scope) |

### Files
| Tool | Description |
|------|-------------|
| `slack.files.upload` | Upload a file to a channel |

---

## Quick Reference

```bash
# 1. Create Slack App at:
#    https://api.slack.com/apps → Create New App → From scratch

# 2. Add redirect URL in OAuth & Permissions:
#    http://localhost:3000/api/slack/callback

# 3. Add bot scopes: channels:read, channels:history, channels:join,
#    groups:read, groups:history, chat:write, users:read, users:read.email,
#    im:read, im:history, mpim:read, mpim:history, reactions:read,
#    reactions:write, files:read, files:write, app_mentions:read

# 4. Add user scope: search:read (optional, for message search)

# 5. Copy credentials from Basic Information:
#    Client ID, Client Secret, Signing Secret

# 6. (Optional) Set up events with ngrok:
npx ngrok http 3000
#    Then set Request URL to: https://your-id.ngrok-free.app/api/slack/events

# 7. Start dev server:
pnpm dev

# 8. Connect at:
#    http://localhost:3000/org/connections
```
