# Prompt: Build a GitHub App Connector

Build a GitHub App connector in my project that lets users connect their GitHub account, select which repositories to grant access to, and allows my app to read/write repos, issues, and pull requests on their behalf.

## How It Works

Use the GitHub App method (not OAuth App, not Personal Access Token). This is the same approach Manus AI uses for their GitHub connector.

The flow:
1. User clicks "Connect GitHub" in my app
2. User is redirected to GitHub to install the GitHub App
3. User selects which repos to grant access to
4. GitHub redirects back to my app with an installation ID
5. My app stores the installation ID and generates short-lived tokens when needed
6. My app can now call GitHub APIs on behalf of that user's repos

## What to Build

### API Routes

- `GET /api/github/connect` — Redirects user to GitHub App installation page
- `GET /api/github/callback` — Handles redirect after user installs the app. Receives `installation_id` and `setup_action` from GitHub. Stores the installation in the database and links it to the current logged-in user.
- `POST /api/webhooks/github` — Receives webhook events from GitHub (push, PR opened, issue created, app uninstalled, etc). Verifies the webhook signature using the webhook secret.
- `GET /api/github/status` — Returns whether the current user has an active GitHub connection and which repos are accessible.
- `DELETE /api/github/disconnect` — Removes the stored installation and optionally calls GitHub API to uninstall the app.
- `GET /api/github/repos` — Lists all repositories the app has access to for this user's installation.

### Token Management

GitHub App installation tokens expire after 1 hour. Build a token manager that:
- Generates a JWT from the App ID + private key to authenticate as the app
- Requests an installation access token using `POST /app/installations/{installation_id}/access_tokens`
- Caches the token with its expiry
- Auto-refreshes before expiry
- Handles revoked installations gracefully (marks connection as disconnected)

### Database

Store this per user:
- `user_id` — link to your user
- `installation_id` — from GitHub
- `github_username` — the GitHub account that installed the app
- `repo_scope` — "all" or list of specific repos
- `status` — connected / disconnected / expired
- `connected_at` — timestamp
- `updated_at` — timestamp

### Environment Variables Needed

```
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_WEBHOOK_SECRET=
```

### GitHub App Registration Settings

When registering the GitHub App on GitHub (Settings → Developer Settings → GitHub Apps → New), use:

- Homepage URL: your app's URL
- Callback URL: `{YOUR_APP_URL}/api/github/callback`
- Setup URL: `{YOUR_APP_URL}/api/github/callback` (same, with redirect on setup checked)
- Webhook URL: `{YOUR_APP_URL}/api/webhooks/github`
- Webhook secret: a secure random string (store as GITHUB_WEBHOOK_SECRET)

Permissions to request:
- Contents: Read & Write
- Issues: Read & Write
- Pull Requests: Read & Write
- Metadata: Read (auto-selected)

Events to subscribe to:
- Installation
- Push
- Pull Request
- Issues
- Issue Comment

Install scope: Any account

### Security Requirements

- Encrypt stored tokens at rest
- Verify webhook signatures on every incoming webhook using HMAC-SHA256
- Never expose the private key or tokens to the frontend
- All GitHub API calls happen server-side only
- Log all write operations (push, PR create, issue create) for audit

### UI Needed

A simple connector settings section with:
- "Connect GitHub" button (when not connected)
- Connected state showing: GitHub username, number of repos accessible, connected date
- "Manage" button to reconfigure repo access (links back to GitHub App install page)
- "Disconnect" button

## Reference Docs

- GitHub Apps overview: https://docs.github.com/en/apps/overview
- Registering a GitHub App: https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app
- Authenticating as a GitHub App: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/about-authentication-with-a-github-app
- Installation access tokens: https://docs.github.com/en/rest/apps/apps#create-an-installation-access-token-for-an-app
- Webhook events: https://docs.github.com/en/webhooks/webhook-events-and-payloads
