# Gmail Connector — Documentation

## Overview

The Gmail connector integrates XO Org with Google's Gmail API using **OAuth 2.0**, enabling agents to read, search, send, and manage emails on behalf of the connected user. This is the same authentication approach used by Manus AI for their Gmail connector.

Once connected, agents can search inboxes, read full email threads, send replies, create drafts, and manage labels — all through a centralized tool system with full audit logging.

---

## Architecture

### High-Level Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                           XO Org                                  │
│                                                                   │
│  ┌──────────┐    ┌────────────────┐    ┌───────────────┐         │
│  │  Bridge   │◄──│ Gmail Tools    │───►│ Gmail REST    │         │
│  │ (events)  │   │ Route          │    │ API           │         │
│  │           │   │ /api/gmail/    │    │               │         │
│  └─────┬─────┘   │ tools          │    │ messages      │         │
│        │         │                │    │ drafts        │         │
│        │         └───────┬────────┘    │ labels        │         │
│  ┌─────▼─────┐           │             │ threads       │         │
│  │  Agents   │    ┌──────▼────────┐    └───────────────┘         │
│  │           │    │ Token Manager │                               │
│  │  aria,    │    │ (gmail.ts)    │    ┌───────────────┐         │
│  │  rex ...  │    │               │◄──►│ Google OAuth  │         │
│  └───────────┘    │ OAuth flow    │    │ 2.0 Server    │         │
│                   │ Token refresh │    └───────────────┘         │
│  ┌────────────┐   │ AES-GCM      │                               │
│  │ Gmail      │   │ encryption   │                               │
│  │ Store      │◄──┘               │                               │
│  │ (encrypted │                                                   │
│  │  tokens)   │                                                   │
│  └────────────┘                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### OAuth Flow

```
User clicks              Google OAuth               XO Org
"Connect Gmail"          Consent Screen              Callback
     │                        │                        │
     │  GET /api/gmail/       │                        │
     │  connect               │                        │
     ├───────────────────────►│                        │
     │                        │                        │
     │  Redirect to Google    │                        │
     │  with scopes:          │                        │
     │  - gmail.modify        │                        │
     │  - userinfo.email      │                        │
     │  - userinfo.profile    │                        │
     │◄───────────────────────┤                        │
     │                        │                        │
     │  User signs in and     │                        │
     │  approves permissions  │                        │
     │────────────────────────►                        │
     │                        │                        │
     │                        │  GET /api/gmail/       │
     │                        │  callback?code=xxx     │
     │                        ├───────────────────────►│
     │                        │                        │
     │                        │  Exchange code for     │
     │                        │  access + refresh      │
     │                        │  tokens                │
     │                        │                        │
     │                        │  Fetch user profile    │
     │                        │  (email, name, avatar) │
     │                        │                        │
     │                        │  Encrypt & store       │
     │                        │  tokens with AES-GCM   │
     │                        │                        │
     │                        │  Redirect to           │
     │                        │  /org/connections      │
     │◄───────────────────────┼────────────────────────┤
     │                        │                        │
     │  Connected!            │                        │
```

### Token Lifecycle

```
┌──────────────────────┐
│  Authorization Code  │  (one-time, from callback)
└──────────┬───────────┘
           │
     POST /oauth2/token
     grant_type=authorization_code
           │
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Access Token        │     │  Refresh Token       │
│  Valid: 1 hour       │     │  Valid: until revoked │
│  Cached encrypted    │     │  Stored encrypted    │
│  in memory           │     │  in memory (AES-GCM) │
└──────────┬───────────┘     └──────────┬───────────┘
           │                            │
     Expires?                    Used to get new
     Auto-refresh                access tokens
     5 min before                      │
     expiry                            │
           │                            │
           ▼                            ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Gmail API Calls     │     │  POST /oauth2/token  │
│  Authenticated as    │     │  grant_type=          │
│  the connected user  │     │  refresh_token        │
└──────────────────────┘     └──────────────────────┘
                                       │
                               Fails with
                               invalid_grant?
                                       │
                                       ▼
                             ┌──────────────────────┐
                             │  Mark connection as  │
                             │  "expired"           │
                             │  User must reconnect │
                             └──────────────────────┘
```

---

## File Structure

```
src/app/api/
├── lib/
│   ├── types.ts              # GmailConnection, GmailToolName, etc.
│   ├── gmail.ts              # OAuth flow, token refresh, encryption, gmailFetch
│   ├── gmail-store.ts        # Connection persistence, auto-refresh logic
│   └── gmail-tools.ts        # Tool registry + all 11 tool implementations
├── gmail/
│   ├── connect/route.ts      # GET  — Redirect to Google OAuth
│   ├── callback/route.ts     # GET  — Handle OAuth callback
│   ├── status/route.ts       # GET  — Connection status
│   ├── disconnect/route.ts   # DELETE — Revoke & remove
│   └── tools/route.ts        # GET  — Tool discovery | POST — Execute tool

src/components/xo/
└── gmail-connector.tsx       # Client component — connect/status/disconnect UI
```

---

## API Reference

### `GET /api/gmail/connect`

Redirects the user to Google's OAuth 2.0 consent screen.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `return_to` | string | `/org/connections` | URL to redirect back to after auth |

**OAuth Parameters Sent to Google:**
- `access_type=offline` — requests a refresh token
- `prompt=consent` — forces consent screen (ensures refresh token is issued)
- `scope` — `gmail.modify`, `userinfo.email`, `userinfo.profile`
- `state` — CSRF protection token + return URL

---

### `GET /api/gmail/callback`

Handles the redirect from Google after OAuth consent. Exchanges the authorization code for tokens, fetches the user's profile, encrypts and stores everything, then redirects back.

**Query Parameters (from Google):**
| Param | Type | Description |
|-------|------|-------------|
| `code` | string | Authorization code |
| `state` | string | CSRF state from connect step |
| `error` | string | Set if user denied access |

**Response:** 302 redirect to `return_to` URL with `?gmail=connected|denied|error`

---

### `GET /api/gmail/status`

Returns the current Gmail connection status.

**Response:**
```json
{
  "ok": true,
  "data": {
    "configured": true,
    "connected": true,
    "connection": {
      "email": "user@gmail.com",
      "displayName": "John Doe",
      "avatarUrl": "https://lh3.googleusercontent.com/...",
      "status": "connected",
      "scopes": ["gmail.modify", "userinfo.email", "userinfo.profile"],
      "connectedAt": 1712300000000,
      "updatedAt": 1712300000000
    }
  }
}
```

---

### `DELETE /api/gmail/disconnect`

Revokes the OAuth token with Google and removes the stored connection.

**Response:**
```json
{
  "ok": true,
  "data": { "disconnected": true }
}
```

---

### `GET /api/gmail/tools` — Tool Discovery

Returns available Gmail tools for agents.

**Response:**
```json
{
  "ok": true,
  "data": {
    "available": true,
    "connected": true,
    "email": "user@gmail.com",
    "tools": [
      {
        "name": "gmail.messages.list",
        "description": "List or search emails using Gmail search syntax",
        "params": { ... }
      }
    ]
  }
}
```

---

### `POST /api/gmail/tools` — Execute Tool

Executes a Gmail tool on behalf of an agent.

**Request Body:**
```json
{
  "agent_id": "aria",
  "tool": "gmail.messages.list",
  "params": {
    "q": "is:unread from:boss@company.com",
    "maxResults": 5
  }
}
```

**Response:**
```json
{
  "ok": true,
  "tool": "gmail.messages.list",
  "call_id": "m_018f..._abc",
  "data": {
    "messages": [
      {
        "id": "18e4f...",
        "threadId": "18e4f...",
        "snippet": "Hey, can you review the Q2 report?",
        "from": "Boss <boss@company.com>",
        "subject": "Q2 Report Review",
        "date": "Sat, 05 Apr 2026 10:30:00 -0700",
        "isUnread": true
      }
    ],
    "resultSizeEstimate": 3,
    "nextPageToken": null
  }
}
```

---

## Agent Gmail Tools — Full Reference

Agents access Gmail through 11 tools across 4 categories via `POST /api/gmail/tools`.

### Messages

| Tool | Description |
|------|-------------|
| `gmail.messages.list` | Search/list emails using Gmail query syntax (`is:unread`, `from:...`, `has:attachment`, etc.) |
| `gmail.messages.get` | Get a full email — headers, decoded body, attachment metadata |
| `gmail.messages.send` | Send an email (constructs RFC 2822, base64url encodes) |
| `gmail.messages.modify` | Add/remove labels (archive, mark read/unread, star, etc.) |
| `gmail.messages.trash` | Move a message to trash |
| `gmail.messages.untrash` | Restore a message from trash |

### Drafts

| Tool | Description |
|------|-------------|
| `gmail.drafts.create` | Create a draft email for review before sending |
| `gmail.drafts.list` | List draft emails |

### Labels

| Tool | Description |
|------|-------------|
| `gmail.labels.list` | List all labels (INBOX, SENT, custom labels, counts) |

### Threads

| Tool | Description |
|------|-------------|
| `gmail.threads.list` | List email threads/conversations |
| `gmail.threads.get` | Get a full thread with all messages and decoded bodies |

---

## How an Agent Uses Gmail (End-to-End Example)

```
Agent Aria                          XO Org                          Gmail API
──────────                          ──────                          ─────────

1. Aria gets task: "Check for unread emails from the client"

2. Aria discovers tools:
   GET /api/gmail/tools
   ◄── Returns 11 available tools

3. Aria searches unread emails:
   POST /api/gmail/tools
   { tool: "gmail.messages.list",
     params: { q: "is:unread from:client@acme.com", maxResults: 5 } }
   ──────────────────────────────────►  gmailFetch() ──────────────►
   ◄── { messages: [{ id: "18e4f...", subject: "Contract Update", ... }] }

4. Aria reads the full email:
   POST /api/gmail/tools
   { tool: "gmail.messages.get",
     params: { id: "18e4f..." } }
   ──────────────────────────────────►  gmailFetch() ──────────────►
   ◄── { subject: "Contract Update", body: "Hi, please review...", ... }

5. Aria creates a draft reply:
   POST /api/gmail/tools
   { tool: "gmail.drafts.create",
     params: {
       to: "client@acme.com",
       subject: "Re: Contract Update",
       body: "Hi, I've reviewed the contract. Here are my notes..."
     } }
   ──────────────────────────────────►  gmailFetch() ──────────────►
   ◄── { id: "draft_abc", messageId: "18e5f..." }

6. Aria marks the original as read:
   POST /api/gmail/tools
   { tool: "gmail.messages.modify",
     params: { id: "18e4f...", removeLabelIds: ["UNREAD"] } }
   ──────────────────────────────────►  gmailFetch() ──────────────►
   ◄── { id: "18e4f...", labelIds: ["INBOX"] }

7. Aria updates the task: "Draft reply created for client email"
```

Every step is logged in the bridge as `tool_call` / `tool_result` pairs. Email body content is **redacted** in bridge logs for privacy — only metadata (subject, sender, action) is recorded.

---

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to **https://console.cloud.google.com/**
2. Create a new project (or select existing)
3. Enable the **Gmail API** from the API Library

### 2. Configure the OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Fill in:
   - App name: `XO Org`
   - User support email: your email
   - Developer contact: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. Add test users (your email for development)
6. Save

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Select **Web application**
4. Add authorized redirect URI: `http://localhost:3000/api/gmail/callback`
5. Save the **Client ID** and **Client Secret**

### 4. Generate an Encryption Key

```bash
# Generate a random 32-byte hex key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Configure Environment Variables

Create or update `.env.local`:

```env
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
ENCRYPTION_KEY=your-64-char-hex-key-from-step-4
```

| Variable | Where to Find |
|----------|--------------|
| `GOOGLE_CLIENT_ID` | Credentials page → OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Credentials page → Client Secret |
| `GOOGLE_REDIRECT_URI` | Must match the authorized redirect URI exactly |
| `ENCRYPTION_KEY` | Generated in step 4 — used to encrypt tokens at rest |

### 6. Connect

1. Start the dev server: `pnpm dev`
2. Navigate to `/org/connections`
3. Click **Connect Gmail**
4. Sign in with your Google account and approve permissions
5. You'll be redirected back with a "Connected" status

---

## Core Modules — Detailed Explanation

### `gmail.ts` — Token Manager & Encryption

**OAuth Functions:**
| Function | Purpose |
|----------|---------|
| `buildOAuthUrl(state)` | Constructs the Google OAuth consent URL with scopes and CSRF state |
| `exchangeCode(code)` | Exchanges authorization code for access + refresh tokens |
| `refreshAccessToken(refreshToken)` | Gets a new access token using the refresh token |
| `revokeToken(token)` | Revokes a token with Google (called on disconnect) |
| `fetchUserProfile(accessToken)` | Gets the user's email, name, and avatar |
| `gmailFetch(accessToken, path, opts)` | Authenticated fetch wrapper for the Gmail API |

**Encryption Functions:**
| Function | Purpose |
|----------|---------|
| `encryptToken(token)` | AES-256-GCM encryption — returns base64 string (IV + ciphertext) |
| `decryptToken(encrypted)` | Decrypts a token from the store |

The encryption key is derived from the `ENCRYPTION_KEY` env var. A random 12-byte IV is generated for each encryption operation and prepended to the ciphertext.

### `gmail-store.ts` — Connection Persistence

Stores Gmail connections in-memory with encrypted tokens. Key function:

**`getValidAccessToken()`** — The core auto-refresh function:
1. Checks if the cached access token is still valid (with 5-min buffer)
2. If expired, decrypts the refresh token and calls Google's token endpoint
3. Re-encrypts and caches the new access token
4. If refresh fails with `invalid_grant`, marks the connection as "expired"
5. Returns `{ token, email }` or `null`

This is called automatically by every tool execution — agents never deal with tokens.

### `gmail-tools.ts` — Tool Implementations

**Key implementation details:**

- **Message body decoding**: Gmail returns bodies as base64url-encoded strings inside nested multipart MIME structures. The `extractBody()` function recursively walks the payload tree, preferring `text/plain` over `text/html`.

- **Email sending**: The `buildRawEmail()` function constructs an RFC 2822 email with proper headers (From, To, Cc, Subject, MIME-Version, Content-Type) and base64url-encodes it for the Gmail API's `raw` format.

- **Message listing**: When listing messages, Gmail only returns IDs. The tool fetches metadata (From, To, Subject, Date) for each message in parallel to provide useful results.

- **Privacy in audit logs**: Email body content is **redacted** in bridge logs. The tools route replaces `body` with `"[redacted]"` in both tool_call and tool_result messages for `gmail.messages.get`, `gmail.messages.send`, `gmail.drafts.create`, and `gmail.threads.get`.

---

## Security

| Measure | Implementation |
|---------|----------------|
| **Token encryption** | AES-256-GCM with random IV per encryption — tokens never stored in plaintext |
| **CSRF protection** | `state` parameter with random nonce in OAuth flow |
| **Server-side only** | All Gmail API calls happen in server-side route handlers |
| **Body redaction** | Email body content is never logged in the bridge — only metadata |
| **Token refresh** | Access tokens auto-refresh; expired refresh tokens mark connection as "expired" |
| **Revocation** | Disconnect calls Google's revoke endpoint before clearing local state |
| **Scope limitation** | Uses `gmail.modify` (sensitive) not `mail.google.com` (restricted) — avoids $500/yr security audit |

---

## Scopes Explained

| Scope | What It Allows | Why We Need It |
|-------|---------------|----------------|
| `gmail.modify` | Read, send, delete, and manage labels | Core email operations for agents |
| `userinfo.email` | Read the user's email address | Display which account is connected |
| `userinfo.profile` | Read the user's name and avatar | Display in the connector UI |

**Why not `mail.google.com` (full access)?**
The restricted `mail.google.com` scope requires a third-party security assessment (~$500/year) and annual re-verification by Google. The `gmail.modify` scope provides the same functionality (read + send + labels) and only requires a standard sensitive scope verification (3-5 business days, free).

---

## Rate Limits

Gmail API uses a quota system:
- **Per-user limit**: 250 quota units per second
- **Read operations**: 5 units each
- **Send operations**: 100 units each
- **Daily sending limit**: 500 emails/day (consumer), 2000/day (Workspace)

The tools module does not implement rate limiting currently. For production, add quota tracking to the governance config similar to GitHub's rate limit integration.

---

## Production Deployment

### Google OAuth Verification

To allow more than 100 users to connect:

1. Submit your app for **sensitive scope verification** in Google Cloud Console
2. Provide:
   - A **YouTube demo video** showing the OAuth flow and data usage
   - A **privacy policy URL**
   - Your **app's homepage URL**
3. Verification takes **3-5 business days** for sensitive scopes
4. No third-party security assessment required (unlike restricted scopes)

### During Development

- You can add up to **100 test users** in the OAuth consent screen settings
- Test users can connect without verification
- Refresh tokens for test apps expire after **7 days** — users will need to reconnect
- After verification, refresh tokens persist until the user revokes access

---

## Extending the Connector

### Adding New Tools

To add a new Gmail tool (e.g., `gmail.attachments.download`):

1. Add the tool name to `GmailToolName` union in `types.ts`
2. Add a `GmailToolDefinition` entry to `GMAIL_TOOLS` in `gmail-tools.ts`
3. Add a case in the `switch(tool)` block in `executeGmailTool()`
4. Implement the handler function using `gmailJson()` helper

### Adding Gmail Push Notifications

Gmail can push real-time notifications via Google Cloud Pub/Sub:

1. Create a Pub/Sub topic and subscription in Google Cloud
2. Call `POST /users/me/watch` with the topic name
3. Receive push notifications when new emails arrive
4. Route notifications into the bridge as agent messages

This would enable agents to react to incoming emails in real-time instead of polling.
