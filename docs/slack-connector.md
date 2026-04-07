# Slack Connector — Documentation

## Overview

The Slack connector integrates XO Org with Slack using a **custom Slack App with OAuth v2 and the Events API**. This is the same approach used by Manus AI. Once connected, agents can read channels, search messages, send replies, and respond to @mentions in real-time.

Key difference from GitHub/Gmail: Slack bot tokens **do not expire** — no refresh flow is needed. Tokens remain valid until the user uninstalls the app or a workspace admin revokes access.

---

## Architecture

### High-Level Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                           XO Org                                  │
│                                                                   │
│  ┌──────────┐    ┌────────────────┐    ┌───────────────┐         │
│  │  Bridge   │◄──│ Events Handler │◄───│ Slack Events  │         │
│  │ (events)  │   │ /api/slack/    │    │ API (inbound) │         │
│  │           │   │ events         │    └───────────────┘         │
│  └─────┬─────┘   └────────────────┘                              │
│        │                                                          │
│        │ @mentions and DMs                                        │
│        │ routed to agents                                         │
│        │                                                          │
│  ┌─────▼─────┐   ┌────────────────┐    ┌───────────────┐         │
│  │  Agents   │──►│ Slack Tools    │───►│ Slack Web API │         │
│  │           │   │ Route          │    │ (outbound)    │         │
│  └───────────┘   └───────┬────────┘    └───────────────┘         │
│                          │                                        │
│  ┌────────────┐   ┌──────▼────────┐                              │
│  │ Slack      │◄──│ Token Store   │                              │
│  │ Store      │   │ (AES-GCM      │                              │
│  │ (encrypted │   │  encrypted)   │                              │
│  │  tokens)   │   └───────────────┘                              │
│  └────────────┘                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### OAuth Flow

```
User clicks              Slack OAuth                XO Org
"Add to Slack"           Consent Page               Callback
     │                        │                        │
     │  GET /api/slack/       │                        │
     │  connect               │                        │
     ├───────────────────────►│                        │
     │                        │                        │
     │  Redirect to Slack     │                        │
     │  with bot scopes:      │                        │
     │  channels:read,        │                        │
     │  chat:write,           │                        │
     │  app_mentions:read ... │                        │
     │◄───────────────────────┤                        │
     │                        │                        │
     │  User selects          │                        │
     │  workspace & approves  │                        │
     │────────────────────────►                        │
     │                        │                        │
     │                        │  GET /api/slack/       │
     │                        │  callback?code=xxx     │
     │                        ├───────────────────────►│
     │                        │                        │
     │                        │  POST oauth.v2.access  │
     │                        │  → bot token           │
     │                        │  → team info           │
     │                        │  → bot user ID         │
     │                        │                        │
     │                        │  Encrypt & store       │
     │                        │                        │
     │◄───────────────────────┼────────────────────────┤
     │                        │                        │
     │  Connected!            │                        │
```

### Events API Flow (Bot @mentions)

```
Slack User                 Slack Platform             XO Org
──────────                 ──────────────             ──────
  │                             │                       │
  │ @xo-bot fix the login bug  │                       │
  │────────────────────────────►│                       │
  │                             │                       │
  │                             │  POST /api/slack/     │
  │                             │  events               │
  │                             │  X-Slack-Signature    │
  │                             ├──────────────────────►│
  │                             │                       │
  │                             │  Verify HMAC-SHA256   │
  │                             │  Deduplicate event    │
  │                             │  Respond 200 (< 3s)  │
  │                             │◄──────────────────────┤
  │                             │                       │
  │                             │  [Async] Route to     │
  │                             │  bridge → agents      │
  │                             │                       │
  │                             │  Agent processes      │
  │                             │  and replies via      │
  │                             │  chat.postMessage     │
  │                             │  (same thread)        │
  │                             │                       │
  │ Got it! Processing...       │◄──────────────────────┤
  │◄────────────────────────────┤                       │
```

---

## File Structure

```
src/app/api/
├── lib/
│   ├── types.ts              # SlackConnection, SlackToolName, etc.
│   ├── slack.ts              # OAuth flow, signing secret verification, slackFetch
│   ├── slack-store.ts        # Connection persistence, token decryption
│   └── slack-tools.ts        # Tool registry + all 10 tool implementations
├── slack/
│   ├── connect/route.ts      # GET  — Redirect to Slack OAuth
│   ├── callback/route.ts     # GET  — Handle OAuth callback
│   ├── status/route.ts       # GET  — Connection status
│   ├── disconnect/route.ts   # DELETE — Revoke & remove
│   ├── events/route.ts       # POST — Events API (mentions, DMs, challenge)
│   └── tools/route.ts        # GET  — Tool discovery | POST — Execute tool

src/components/xo/
└── slack-connector.tsx       # Client component — connect/status/disconnect UI
```

---

## API Reference

### `GET /api/slack/connect`

Redirects to Slack's OAuth v2 consent page with bot + user scopes.

### `GET /api/slack/callback`

Handles OAuth callback. Exchanges code for bot token, stores encrypted.

### `GET /api/slack/status`

Returns connection status, workspace name, bot user ID, whether user token (search) is available.

### `DELETE /api/slack/disconnect`

Revokes token via `auth.revoke`, removes stored connection.

### `POST /api/slack/events`

Receives Slack Events API payloads. Handles:
- **`url_verification`** — Returns challenge (one-time setup)
- **`app_mention`** — Routes to bridge, auto-replies in thread
- **`message.im`** — Routes DMs to bridge

Security: Verifies HMAC-SHA256 signature, rejects timestamps >5 min old, deduplicates by event_id.

### `GET /api/slack/tools` — Tool Discovery

Returns available Slack tools for agents.

### `POST /api/slack/tools` — Execute Tool

Executes a Slack tool on behalf of an agent. All calls are audit-logged in the bridge.

---

## Agent Slack Tools — Full Reference

10 tools across 5 categories via `POST /api/slack/tools`.

### Channels

| Tool | Description |
|------|-------------|
| `slack.channels.list` | List channels (public, private, DMs, group DMs) with topic, purpose, member count |
| `slack.channels.history` | Read message history from a channel (with pagination, time range) |
| `slack.channels.join` | Join a public channel |

### Threads

| Tool | Description |
|------|-------------|
| `slack.threads.replies` | Read all replies in a specific thread |

### Messages

| Tool | Description |
|------|-------------|
| `slack.messages.send` | Send a message or reply in a thread (supports Block Kit) |
| `slack.messages.react` | Add an emoji reaction to a message |

### Users

| Tool | Description |
|------|-------------|
| `slack.users.list` | List all workspace members (name, email, status, avatar) |
| `slack.users.info` | Get detailed info about a specific user |

### Search & Files

| Tool | Description |
|------|-------------|
| `slack.search.messages` | Search messages across workspace (requires user token with `search:read`) |
| `slack.files.upload` | Upload a file and share it in a channel (uses new upload API) |

---

## How an Agent Uses Slack (End-to-End Example)

```
Agent Rex                           XO Org                          Slack API
─────────                           ──────                          ─────────

1. Rex gets task: "Summarize today's discussion in #engineering"

2. Rex discovers tools:
   GET /api/slack/tools
   ◄── Returns 10 available tools

3. Rex lists channels to find #engineering:
   POST /api/slack/tools
   { tool: "slack.channels.list", params: { types: "public_channel" } }
   ◄── { channels: [{ id: "C0123", name: "engineering", ... }] }

4. Rex reads recent messages:
   POST /api/slack/tools
   { tool: "slack.channels.history",
     params: { channel: "C0123", limit: 50 } }
   ◄── { messages: [{ user: "U0123", text: "We should refactor...", ... }] }

5. Rex reads a specific thread:
   POST /api/slack/tools
   { tool: "slack.threads.replies",
     params: { channel: "C0123", ts: "1712345678.123456" } }
   ◄── { messages: [...all replies...] }

6. Rex posts a summary:
   POST /api/slack/tools
   { tool: "slack.messages.send",
     params: {
       channel: "C0123",
       text: "📋 *Today's Discussion Summary*\n\n• Refactor auth module...\n• Deploy v2.4 by Friday..."
     } }
   ◄── { channel: "C0123", ts: "1712345999.000001" }

7. Rex reacts to confirm:
   POST /api/slack/tools
   { tool: "slack.messages.react",
     params: { channel: "C0123", timestamp: "1712345999.000001", name: "white_check_mark" } }
```

---

## Setup Instructions

### 1. Create a Slack App

1. Go to **https://api.slack.com/apps** → **Create New App** → **From scratch**
2. Name: `XO Org` (or your preferred name)
3. Pick your development workspace

### 2. Configure OAuth & Permissions

1. Go to **OAuth & Permissions** in the left sidebar
2. Add **Redirect URL**: `http://localhost:3000/api/slack/callback`
3. Add **Bot Token Scopes**:

| Scope | Purpose |
|-------|---------|
| `channels:read` | List public channels |
| `channels:history` | Read public channel messages |
| `channels:join` | Join public channels |
| `groups:read` | List private channels |
| `groups:history` | Read private channel messages |
| `chat:write` | Send messages |
| `users:read` | List workspace members |
| `users:read.email` | Get user emails |
| `im:read` | List DM channels |
| `im:history` | Read DMs |
| `mpim:read` | List group DMs |
| `mpim:history` | Read group DMs |
| `reactions:read` | View reactions |
| `reactions:write` | Add reactions |
| `files:read` | Access files |
| `files:write` | Upload files |
| `app_mentions:read` | Receive @mention events |

4. Add **User Token Scopes** (optional, for search):
   - `search:read`

### 3. Configure Event Subscriptions

1. Go to **Event Subscriptions** → Enable Events
2. Set **Request URL**: `https://your-domain.com/api/slack/events`
   (Needs a tunnel for local dev — see step 6)
3. Subscribe to **Bot Events**:
   - `app_mention`
   - `message.channels`
   - `message.im`
4. Save Changes

### 4. Get Credentials

Go to **Basic Information** and copy:
- **Client ID**
- **Client Secret**
- **Signing Secret**

### 5. Configure Environment Variables

```env
SLACK_CLIENT_ID=123456789.987654321
SLACK_CLIENT_SECRET=abc123def456
SLACK_SIGNING_SECRET=xyz789
ENCRYPTION_KEY=your-64-char-hex-key
```

### 6. Expose Events Endpoint (Development)

```bash
ngrok http 3000
# Update Event Subscriptions Request URL to:
# https://your-id.ngrok-free.app/api/slack/events
```

### 7. Install the App

1. Start dev server: `pnpm dev`
2. Navigate to `/org/connections`
3. Click **Add to Slack**
4. Select your workspace and approve
5. Connected!

---

## Security

| Measure | Implementation |
|---------|----------------|
| **Token encryption** | AES-256-GCM (reuses Gmail encryption module) |
| **Event verification** | HMAC-SHA256 with signing secret, rejects >5 min old timestamps |
| **CSRF protection** | `state` parameter with random nonce in OAuth flow |
| **Bot loop prevention** | Events handler ignores messages from the bot's own user ID |
| **Event deduplication** | Tracks processed `event_id` values to prevent double-processing |
| **3-second rule** | Responds to Slack immediately, processes events asynchronously |
| **Server-side only** | All Slack API calls happen in server-side route handlers |

---

## Key Differences from GitHub/Gmail

| | GitHub | Gmail | Slack |
|---|---|---|---|
| **Auth method** | GitHub App (JWT) | OAuth 2.0 + refresh | OAuth v2 (no refresh) |
| **Token expiry** | 1 hour | 1 hour (refresh available) | **Never** (until revoked) |
| **Real-time events** | Webhooks | Requires Pub/Sub | **Events API (built-in)** |
| **Bot identity** | `xo-org[bot]` | Acts as user | Bot user in workspace |
| **Search** | API with bot token | API with access token | **Requires user token** |
| **Encryption needed** | No (short-lived) | Yes (refresh token) | Yes (permanent bot token) |

---

## Rate Limits

| Tier | Limit | Methods |
|------|-------|---------|
| Tier 1 | ~1 req/min | Admin methods |
| Tier 2 | ~20 req/min | Most read methods (`conversations.list`, `users.list`) |
| Tier 3 | ~50 req/min | `chat.postMessage`, `reactions.add` |
| Tier 4 | ~100 req/min | Some lookup methods |

Handle `429` responses by reading the `Retry-After` header. No verification process is needed for Slack — your app can be installed on any workspace immediately via OAuth.
