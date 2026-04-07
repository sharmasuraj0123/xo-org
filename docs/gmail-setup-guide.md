# Gmail Connector — Step-by-Step Setup Guide

This guide walks you through setting up the Gmail connector for XO Org from scratch. It covers creating Google Cloud credentials, configuring OAuth, handling common issues, and verifying the connection.

> **Prerequisites**: Node.js 18+, pnpm, and a Google account.

---

## Table of Contents

1. [Create a Google Cloud Project](#1-create-a-google-cloud-project)
2. [Enable the Gmail API](#2-enable-the-gmail-api)
3. [Configure the OAuth Consent Screen](#3-configure-the-oauth-consent-screen)
4. [Create OAuth 2.0 Credentials](#4-create-oauth-20-credentials)
5. [Generate an Encryption Key](#5-generate-an-encryption-key)
6. [Configure Environment Variables](#6-configure-environment-variables)
7. [Start the Dev Server](#7-start-the-dev-server)
8. [Connect Gmail](#8-connect-gmail)
9. [Verify the Connection](#9-verify-the-connection)
10. [Troubleshooting](#10-troubleshooting)
11. [Environment Variable Reference](#11-environment-variable-reference)
12. [Development vs Production](#12-development-vs-production)

---

## 1. Create a Google Cloud Project

1. Go to **https://console.cloud.google.com/**
2. Click the **project dropdown** at the top of the page
3. Click **New Project**
4. Fill in:

| Field | Value |
|-------|-------|
| **Project name** | `XO Org` (or any name) |
| **Organization** | Leave as default |
| **Location** | Leave as default |

5. Click **Create**
6. Wait for the project to be created (a notification will appear)
7. **Select the new project** from the project dropdown — make sure it's active before continuing

> **Tip**: If you already have a Google Cloud project with billing enabled, you can reuse it. Just make sure the correct project is selected.

---

## 2. Enable the Gmail API

1. Go to **https://console.cloud.google.com/apis/library/gmail.googleapis.com**
   - Or navigate manually: **APIs & Services** → **Library** → search for "Gmail API"
2. Click **Enable**
3. Wait for the API to be enabled — the page will change to show "Manage" when done

> **Verification**: If the button says **"Manage"** instead of "Enable", the Gmail API is already enabled.

---

## 3. Configure the OAuth Consent Screen

The consent screen is what users see when they click "Connect Gmail" and are asked to grant permissions.

### Step 3.1 — Create the Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
   - Or: https://console.cloud.google.com/apis/credentials/consent
2. Select **External** user type
3. Click **Create**

### Step 3.2 — Fill in App Information

| Field | Value | Notes |
|-------|-------|-------|
| **App name** | `XO Org` | Shown to users on the consent screen |
| **User support email** | Your email | Must be a valid email |
| **App logo** | _(optional)_ | Can add later |
| **Developer contact email** | Your email | Google uses this for notifications |

Click **Save and Continue**

### Step 3.3 — Add Scopes

1. Click **Add or Remove Scopes**
2. In the search/filter box, search for and add these 3 scopes:

| Scope | Purpose |
|-------|---------|
| `https://www.googleapis.com/auth/gmail.modify` | Read, send, and manage emails and labels |
| `https://www.googleapis.com/auth/userinfo.email` | Get the user's email address |
| `https://www.googleapis.com/auth/userinfo.profile` | Get the user's name and avatar |

3. Click **Update**
4. Click **Save and Continue**

> **Why `gmail.modify` and not `mail.google.com`?** The restricted `mail.google.com` scope requires a paid third-party security audit (~$500/year). The `gmail.modify` scope provides the same functionality (read, send, labels) and only requires a free sensitive scope verification.

### Step 3.4 — Add Test Users

1. Click **Add Users**
2. Enter **your Gmail address** (the one you'll use to test the connection)
3. Click **Add**
4. Click **Save and Continue**

> **Important**: While in "Testing" mode, only users listed here can connect. You can add up to 100 test users. Refresh tokens for test apps expire after **7 days** — users will need to reconnect weekly during development.

### Step 3.5 — Review and Confirm

Review the summary and click **Back to Dashboard**.

---

## 4. Create OAuth 2.0 Credentials

### Step 4.1 — Navigate to Credentials

1. Go to **APIs & Services** → **Credentials**
   - Or: https://console.cloud.google.com/apis/credentials
2. Click **Create Credentials** → **OAuth 2.0 Client ID**

### Step 4.2 — Configure the OAuth Client

| Field | Value |
|-------|-------|
| **Application type** | Web application |
| **Name** | `XO Org` (or any name — this is internal) |

### Step 4.3 — Add Authorized Redirect URI

Under **Authorised redirect URIs**, click **+ Add URI** and enter exactly:

```
http://localhost:3000/api/gmail/callback
```

> **Critical**: This URI must match **exactly** — including:
> - Protocol: `http` (not `https`) for localhost
> - Port: `3000`
> - Path: `/api/gmail/callback`
> - No trailing slash
>
> A mismatch will cause a `redirect_uri_mismatch` error during the OAuth flow.

Leave **Authorised JavaScript origins** empty — it's not needed.

### Step 4.4 — Create and Copy Credentials

1. Click **Create**
2. A dialog appears with your **Client ID** and **Client Secret**
3. **Copy both values immediately** — the Client Secret is only shown once in this dialog
4. You can also click **Download JSON** to save a backup

> **If you missed the Client Secret**: Go to Credentials → click on your OAuth client → click "Reset Secret" to generate a new one. The old secret will be invalidated.

**Your credentials will look like:**
```
Client ID:     799357771625-abc123.apps.googleusercontent.com
Client Secret: GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 5. Generate an Encryption Key

Gmail OAuth tokens are encrypted at rest using AES-256-GCM. You need to generate a 32-byte (64-character hex) encryption key.

Run this in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example output:**
```
c5158298b1180db60b4c6bf23336f81280b6a7a55a46972cd902add7fa0fcf15
```

Copy this value — it's your `ENCRYPTION_KEY`.

> **Important**: This key encrypts all OAuth tokens (Gmail, Slack, Stripe, Vercel). If you change it later, all existing connections will break and users will need to reconnect.

---

## 6. Configure Environment Variables

Add the Gmail section to your `.env.local` file (create it if it doesn't exist):

```env
# ─── Gmail (Google OAuth 2.0) ────────────────────────────────
GOOGLE_CLIENT_ID=799357771625-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback

# ─── Token Encryption ───────────────────────────────────────
ENCRYPTION_KEY=c5158298b1180db60b4c6bf23336f81280b6a7a55a46972cd902add7fa0fcf15
```

### Where to Find Each Value

| Variable | Location |
|----------|----------|
| `GOOGLE_CLIENT_ID` | Google Cloud Console → Credentials → your OAuth client → "Client ID" |
| `GOOGLE_CLIENT_SECRET` | Shown once when creating the client, or from the downloaded JSON file |
| `GOOGLE_REDIRECT_URI` | Must be exactly `http://localhost:3000/api/gmail/callback` |
| `ENCRYPTION_KEY` | Generated in Step 5 (64-character hex string) |

> **Using the downloaded JSON file**: If you downloaded the client secret JSON, the values are:
> ```json
> {
>   "web": {
>     "client_id": "→ GOOGLE_CLIENT_ID",
>     "client_secret": "→ GOOGLE_CLIENT_SECRET",
>     "redirect_uris": ["→ GOOGLE_REDIRECT_URI"]
>   }
> }
> ```

---

## 7. Start the Dev Server

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

Confirm `.env.local` is listed under **Environments**.

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
lsof -ti:3000 | xargs kill -9
```

Then run `pnpm dev` again.

---

## 8. Connect Gmail

1. Open **http://localhost:3000/org/connections** in your browser
2. The Gmail card should show **"Connect Gmail"** — not "Not Configured"
3. Click **Connect Gmail**
4. Google's OAuth consent screen opens:
   - Select your Google account (must be a test user from Step 3.4)
   - You'll see a warning: "Google hasn't verified this app" — click **Continue**
   - Review the requested permissions and click **Allow**
5. You'll be redirected back to the connections page with a "Connected" status

### What Happens Under the Hood

```
1. Browser → GET /api/gmail/connect
2. Server builds OAuth URL with scopes + CSRF state
3. Redirect → https://accounts.google.com/o/oauth2/auth?...
4. User approves permissions on Google's consent screen
5. Google redirects → GET /api/gmail/callback?code=xxx&state=yyy
6. Server exchanges code for access_token + refresh_token
7. Server fetches user profile (email, name, avatar)
8. Server encrypts tokens with AES-256-GCM and stores in memory
9. Redirect → /org/connections?gmail=connected
10. UI shows "Connected" with email, avatar, and connection date
```

### Token Lifecycle

- **Access tokens** expire after **1 hour** — automatically refreshed using the refresh token
- **Refresh tokens** persist until the user revokes access (or 7 days in testing mode)
- Tokens are encrypted at rest using AES-256-GCM with the `ENCRYPTION_KEY`
- If the refresh token becomes invalid, the connection is marked as "expired" and the user must reconnect

---

## 9. Verify the Connection

### Check the UI

After connecting, the Gmail card should show:
- Email address and avatar
- "Connected" badge with connection date
- **Manage Permissions** / **Refresh** / **Disconnect** buttons

### Check the API

```bash
# Connection status
curl http://localhost:3000/api/gmail/status

# Expected response:
# { "ok": true, "data": { "configured": true, "connected": true, "connection": { ... } } }

# List available tools
curl http://localhost:3000/api/gmail/tools

# Expected: 11 tools across messages, drafts, labels, threads
```

### Test a Tool Call

```bash
# List recent emails
curl -X POST http://localhost:3000/api/gmail/tools \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "test", "tool": "gmail.messages.list", "params": {"q": "is:unread", "maxResults": 5}}'

# List labels
curl -X POST http://localhost:3000/api/gmail/tools \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "test", "tool": "gmail.labels.list", "params": {}}'
```

---

## 10. Troubleshooting

### "Not Configured" — Gmail card shows env vars are missing

| Cause | Fix |
|-------|-----|
| `.env.local` doesn't exist | Create it: `cp .env.example .env.local` |
| `GOOGLE_CLIENT_ID` is empty | Copy the Client ID from Google Cloud Console → Credentials |
| `GOOGLE_CLIENT_SECRET` is empty | Reset the client secret in Google Cloud Console if you lost it |
| Server not restarted | Stop and restart `pnpm dev` after editing `.env.local` |

### "Error 403: access_denied" — User can't connect

| Cause | Fix |
|-------|-----|
| User is not a test user | Add their email in OAuth consent screen → Test users |
| App is in "Testing" mode | Only listed test users can connect. For public access, submit for verification |

### "Error 400: redirect_uri_mismatch"

| Cause | Fix |
|-------|-----|
| Redirect URI doesn't match | Ensure `GOOGLE_REDIRECT_URI` in `.env.local` matches exactly what's in Google Cloud Console |
| Trailing slash mismatch | Remove any trailing slash from the URI |
| http vs https mismatch | Use `http` for localhost, `https` for production |
| Wrong port | Ensure the port matches your dev server (default: 3000) |

### "Google hasn't verified this app" warning

This is **normal during development**. Click **Continue** (or **Advanced** → **Go to XO Org (unsafe)**). This warning goes away after you submit the app for verification (see [Section 12](#12-development-vs-production)).

### "Connect Gmail" works but redirects back with error

| Cause | Fix |
|-------|-----|
| Gmail API not enabled | Enable it at https://console.cloud.google.com/apis/library/gmail.googleapis.com |
| `ENCRYPTION_KEY` is missing | Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| Client secret is wrong | Re-check or reset the client secret in Google Cloud Console |
| Missing refresh token | The code requires `access_type=offline` — this is handled automatically |

### Connection shows "Expired" — must reconnect

| Cause | Fix |
|-------|-----|
| Testing mode token expiry | Test app refresh tokens expire after 7 days. Reconnect. |
| User revoked access | User removed the app at https://myaccount.google.com/permissions |
| `ENCRYPTION_KEY` changed | Changing the key invalidates all stored tokens. Users must reconnect. |

### Token encryption errors

| Cause | Fix |
|-------|-----|
| `ENCRYPTION_KEY` not set | Add it to `.env.local` (64-char hex string) |
| Key is wrong length | Must be exactly 64 hex characters (32 bytes) |
| Key changed after connection | All existing tokens are invalidated. Users must reconnect. |

---

## 11. Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | OAuth 2.0 Client ID (e.g., `799357771625-abc.apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth 2.0 Client Secret (e.g., `GOCSPX-xxx`) |
| `GOOGLE_REDIRECT_URI` | Yes | Must match the authorized redirect URI in Google Cloud Console |
| `ENCRYPTION_KEY` | Yes | 64-character hex string for AES-256-GCM token encryption |

### Security Notes

- **Never commit `.env.local`** — it's already in `.gitignore`
- **Never commit the client secret JSON file** — delete it from your project directory after copying values
- All Gmail API calls happen server-side — tokens are never exposed to the browser
- Tokens are encrypted at rest using AES-256-GCM with a random IV per encryption
- Email body content is **redacted** in bridge audit logs — only metadata (subject, sender) is logged
- On disconnect, the token is revoked with Google before clearing local state

---

## 12. Development vs Production

### During Development (Testing Mode)

- Up to **100 test users** can be added
- Users see "Google hasn't verified this app" warning
- Refresh tokens expire after **7 days** — users must reconnect weekly
- No verification required

### For Production

To remove the "unverified app" warning and allow anyone to connect:

1. Go to **OAuth consent screen** in Google Cloud Console
2. Click **Publish App**
3. Submit for **sensitive scope verification**:
   - Provide a **YouTube demo video** showing the OAuth flow
   - Provide a **privacy policy URL**
   - Provide your **app's homepage URL**
4. Verification takes **3-5 business days** (free for sensitive scopes)
5. After verification:
   - All users can connect (no test user limit)
   - Refresh tokens persist until revoked
   - No "unverified app" warning

> **Note**: If you used the `mail.google.com` (restricted) scope instead of `gmail.modify` (sensitive), you'd need a paid third-party security assessment (~$500/year). The `gmail.modify` scope avoids this cost while providing the same functionality.

### Production Redirect URI

Update the authorized redirect URI in Google Cloud Console:
```
https://yourdomain.com/api/gmail/callback
```

And update `.env.local` (or your production env):
```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/gmail/callback
```

---

## Available Gmail Tools (11 total)

After connecting, agents have access to these tools:

### Messages
| Tool | Description |
|------|-------------|
| `gmail.messages.list` | Search emails with Gmail query syntax (`is:unread`, `from:user@example.com`) |
| `gmail.messages.get` | Read a full email — headers, decoded body, attachments list |
| `gmail.messages.send` | Send an email (to, cc, bcc, subject, body) |
| `gmail.messages.modify` | Add/remove labels (archive, star, mark as read/unread) |
| `gmail.messages.trash` | Move an email to trash |
| `gmail.messages.untrash` | Restore an email from trash |

### Drafts
| Tool | Description |
|------|-------------|
| `gmail.drafts.create` | Create a draft for review before sending |
| `gmail.drafts.list` | List all drafts |

### Labels
| Tool | Description |
|------|-------------|
| `gmail.labels.list` | List all labels with unread/total counts |

### Threads
| Tool | Description |
|------|-------------|
| `gmail.threads.list` | List conversation threads |
| `gmail.threads.get` | Get a full thread with all messages |

---

## Quick Reference

```bash
# 1. Create Google Cloud project:
#    https://console.cloud.google.com/

# 2. Enable Gmail API:
#    https://console.cloud.google.com/apis/library/gmail.googleapis.com

# 3. Configure OAuth consent screen:
#    https://console.cloud.google.com/apis/credentials/consent

# 4. Create OAuth credentials:
#    https://console.cloud.google.com/apis/credentials

# 5. Generate encryption key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 6. Start dev server:
pnpm dev

# 7. Connect at:
#    http://localhost:3000/org/connections
```
