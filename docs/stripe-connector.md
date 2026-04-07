# Stripe Connector — Documentation

## Overview

The Stripe connector integrates XO Org with Stripe using **Connect OAuth 2.0 for Standard accounts**. This is the same approach used by Manus AI. Once connected, agents can view customers, charges, invoices, subscriptions, and balances, and perform actions like creating customers, issuing refunds, and generating payment links — all on behalf of the connected Stripe account.

Key difference from other connectors: **Standard Connect OAuth tokens do not expire**. The platform uses its own secret key with the `Stripe-Account` header to act on behalf of the connected account, so token refresh is not needed.

---

## Architecture

### High-Level Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                           XO Org                                  │
│                                                                   │
│  ┌──────────┐    ┌────────────────┐    ┌───────────────┐         │
│  │  Bridge   │◄──│ Webhook Handler│◄───│ Stripe        │         │
│  │ (events)  │   │ /api/stripe/   │    │ Webhooks      │         │
│  │           │   │ webhooks       │    └───────────────┘         │
│  └─────┬─────┘   └────────────────┘                              │
│        │                                                          │
│  ┌─────▼─────┐   ┌────────────────┐    ┌───────────────┐         │
│  │  Agents   │──►│ Stripe Tools   │───►│ Stripe API    │         │
│  │           │   │ Route          │    │ (with         │         │
│  └───────────┘   └───────┬────────┘    │ Stripe-Account│         │
│                          │             │ header)       │         │
│  ┌────────────┐   ┌──────▼────────┐    └───────────────┘         │
│  │ Stripe     │   │ Platform      │                              │
│  │ Store      │   │ Secret Key    │                              │
│  │ (acct ID)  │   │ (sk_...)      │                              │
│  └────────────┘   └───────────────┘                              │
└──────────────────────────────────────────────────────────────────┘
```

### OAuth Flow

```
User                     Stripe Connect              XO Org
────                     ──────────────              ──────

1. Click "Connect with Stripe"
   GET /api/stripe/connect
   ─────────────────────────►

2. Redirect to Stripe
   ◄─────────────────────────
   https://connect.stripe.com/oauth/authorize
   ?client_id=ca_...&scope=read_write

3. User signs in / approves
   ─────────────────────────►

4. Redirect to callback
   GET /api/stripe/callback?code=ac_...
                              ─────────────────────►

5. Exchange code for credentials
   POST connect.stripe.com/oauth/token
   → stripe_user_id (acct_...)
   → access_token
   → refresh_token
   → livemode (true/false)

6. Fetch account details
   GET api.stripe.com/v1/accounts/{acct_...}

7. Encrypt & store, redirect back
   ◄────────────────────────────────────────
```

### API Call Pattern

Unlike other connectors where you use the connected account's token, Stripe Connect uses **your platform's secret key** with the connected account's ID:

```
Every API request:
  Authorization: Bearer sk_test_...         ← Your platform key
  Stripe-Account: acct_...                  ← Connected account ID
```

This means the connected account's token doesn't need to be decrypted for every request — the `stripe_user_id` is sufficient.

---

## File Structure

```
src/app/api/
├── lib/
│   ├── types.ts              # StripeConnection, StripeToolName, etc.
│   ├── stripe.ts             # OAuth flow, webhook verification, stripeFetch
│   ├── stripe-store.ts       # Connection persistence
│   └── stripe-tools.ts       # Tool registry + all 13 tool implementations
├── stripe/
│   ├── connect/route.ts      # GET  — Redirect to Stripe OAuth
│   ├── callback/route.ts     # GET  — Handle OAuth callback
│   ├── status/route.ts       # GET  — Connection status
│   ├── disconnect/route.ts   # DELETE — Deauthorize & remove
│   ├── webhooks/route.ts     # POST — Receive Stripe webhook events
│   └── tools/route.ts        # GET  — Tool discovery | POST — Execute tool

src/components/xo/
└── stripe-connector.tsx      # Client component — connect/status/disconnect UI
```

---

## API Reference

### `GET /api/stripe/connect`
Redirects to Stripe Connect OAuth. Supports `?scope=read_write` (default) or `?scope=read_only`.

### `GET /api/stripe/callback`
Handles OAuth callback, exchanges code, fetches account details, stores connection.

### `GET /api/stripe/status`
Returns connection status including business name, account ID, scope, and live/test mode.

### `DELETE /api/stripe/disconnect`
Deauthorizes via `connect.stripe.com/oauth/deauthorize`, removes stored connection.

### `POST /api/stripe/webhooks`
Receives Stripe webhook events. Verifies HMAC-SHA256 signature. Handles:
- `account.deauthorized` → marks connection as revoked
- `charge.succeeded` / `charge.failed` → routes to bridge
- `invoice.paid` / `invoice.payment_failed` → routes to bridge
- `payout.paid` → routes to bridge

### `GET /api/stripe/tools` — Tool Discovery
### `POST /api/stripe/tools` — Execute Tool

---

## Agent Stripe Tools — Full Reference

13 tools across 7 categories via `POST /api/stripe/tools`.

### Customers

| Tool | Description |
|------|-------------|
| `stripe.customers.list` | List customers (filter by email, pagination) |
| `stripe.customers.get` | Get customer details with subscriptions |
| `stripe.customers.create` | Create a new customer |

### Charges

| Tool | Description |
|------|-------------|
| `stripe.charges.list` | List recent charges (filter by customer) |

### Balance

| Tool | Description |
|------|-------------|
| `stripe.balance.get` | Get current balance across all currencies |
| `stripe.balance.transactions` | List balance transactions (amounts, fees, net) |

### Invoices & Subscriptions

| Tool | Description |
|------|-------------|
| `stripe.invoices.list` | List invoices (filter by customer, status) |
| `stripe.subscriptions.list` | List subscriptions with plan details |

### Products & Prices

| Tool | Description |
|------|-------------|
| `stripe.products.list` | List all products |
| `stripe.prices.list` | List prices (filter by product) |

### Payments

| Tool | Description |
|------|-------------|
| `stripe.payment_links.create` | Create a shareable payment link from a price ID |
| `stripe.refunds.create` | Issue a full or partial refund |

### Payouts

| Tool | Description |
|------|-------------|
| `stripe.payouts.list` | List recent payouts to bank |

---

## Setup Instructions

### 1. Enable Stripe Connect

1. Go to **https://dashboard.stripe.com/settings/applications**
2. Enable OAuth for Standard accounts
3. Add redirect URI: `http://localhost:3000/api/stripe/callback`
4. Copy the **Client ID** (starts with `ca_`)

### 2. Get API Keys

1. Go to **Developers** → **API keys** in Stripe Dashboard
2. Copy your **Secret key** (starts with `sk_test_`)

### 3. Set Up Webhooks

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. URL: `http://localhost:3000/api/stripe/webhooks` (needs tunnel for local dev)
3. Events: `account.deauthorized`, `charge.succeeded`, `charge.failed`, `invoice.paid`, `invoice.payment_failed`, `payout.paid`
4. Copy the **Signing secret** (starts with `whsec_`)

### 4. Configure Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_CLIENT_ID=ca_...
STRIPE_WEBHOOK_SECRET=whsec_...
ENCRYPTION_KEY=your-64-char-hex-key
```

### 5. Connect

1. `pnpm dev`
2. Navigate to `/org/connections`
3. Click **Connect with Stripe**
4. Sign in to your Stripe account and approve
5. Connected! The UI shows business name, account ID, and test/live mode indicator

---

## Security

| Measure | Implementation |
|---------|----------------|
| **Token encryption** | AES-256-GCM for stored access/refresh tokens |
| **Webhook verification** | HMAC-SHA256 with Stripe signing secret, rejects >5 min old |
| **CSRF protection** | `state` parameter with random nonce in OAuth flow |
| **Server-side only** | All Stripe API calls in server-side route handlers |
| **Live/test mode indicator** | UI clearly shows if connection is live or test mode |
| **Audit logging** | Every tool call/result logged in bridge |
| **Platform key auth** | Uses platform's secret key + Stripe-Account header (connected token not needed per request) |

### Financial Safety

Agents should **always confirm** with the user before:
- Creating customers
- Issuing refunds
- Creating payment links
- Any write operation involving money

This should be enforced via the governance config's task approval workflow.

---

## Key Differences from Other Connectors

| | GitHub | Gmail | Slack | Stripe |
|---|---|---|---|---|
| **Auth** | GitHub App JWT | OAuth 2.0 | OAuth v2 | Connect OAuth |
| **Token expiry** | 1 hour | 1 hour | Never | **Never** |
| **API auth** | Installation token | Access token | Bot token | **Platform key + Stripe-Account header** |
| **Real money** | No | No | No | **Yes — extra safety needed** |
| **Webhooks** | Built-in | Pub/Sub | Events API | Webhook endpoints |

---

## All Connectors Summary

| Connector | Auth | Tools | Real-time | Docs |
|-----------|------|-------|-----------|------|
| **GitHub** | GitHub App (JWT) | 25 tools | Webhooks | [github-connector.md](github-connector.md) |
| **Gmail** | OAuth 2.0 + refresh | 11 tools | — | [gmail-connector.md](gmail-connector.md) |
| **Slack** | OAuth v2 + Events API | 10 tools | @mentions + DMs | [slack-connector.md](slack-connector.md) |
| **Stripe** | Connect OAuth | 13 tools | Webhooks | [stripe-connector.md](stripe-connector.md) |
| **Total** | | **59 tools** | | |
