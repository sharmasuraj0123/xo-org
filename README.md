# XO Org

A dual-mode workspace for managing and orchestrating AI agents. Run a full multi-agent organization or deploy a single standalone agent — same codebase, one environment variable.

```
NEXT_PUBLIC_XO_MODE=org    # multi-agent workspace
NEXT_PUBLIC_XO_MODE=agent  # single-agent deployment
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js 16)                     │
│                                                                 │
│  ┌──────────┐   proxy.ts redirects   ┌──────────────────────┐  │
│  │  /  root  │ ─────────────────────► │  /org  or  /agent    │  │
│  └──────────┘   based on XO_MODE     └──────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────┬────────────────────────────┐  │
│  │         Org Mode            │        Agent Mode          │  │
│  │                             │                            │  │
│  │  /org                       │  /agent                    │  │
│  │  /org/agents                │  /agent/chat               │  │
│  │  /org/objectives            │                            │  │
│  │  /org/storage               │  (Chat + Dashboard only)   │  │
│  │  /org/reports               │                            │  │
│  │  /org/docs                  │                            │  │
│  │  /org/channel/[id]          │                            │  │
│  │                             │                            │  │
│  │  /agent/[id]  (drill-in)    │                            │  │
│  │  /agent/[id]/chat           │                            │  │
│  │  /agent/[id]/objectives     │                            │  │
│  └─────────────────────────────┴────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     API Routes (/api)                     │  │
│  │  agents · messages · tasks · channels · governance        │  │
│  │  stream (SSE) · storage · proxy                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   ┌──────────┐      ┌──────────────┐     ┌──────────────┐
   │ In-memory│      │  localStorage│     │   External   │
   │  Bridge  │      │  (sessions)  │     │   Backend    │
   │ (events) │      │              │     │  :8000       │
   └──────────┘      └──────────────┘     └──────────────┘
```

### How Modes Work

The `NEXT_PUBLIC_XO_MODE` environment variable controls everything:

| | Org Mode | Agent Mode |
|---|---|---|
| **Route prefix** | `/org/*` | `/agent/*` |
| **Sidebar nav** | Dashboard, Agents, Objectives | Chat, Dashboard |
| **Context switcher** | Dropdown with org + all agents | Fixed agent identity |
| **Storage isolation** | `xo-org-session-*` keys | `xo-agent-session-*` keys |
| **Agent picker** | Yes — click into `/agent/[id]` | No — single fixed agent |
| **Blocked routes** | None | `/org/*` redirects to `/agent` |

### Data Flow

```
User action (chat message, task creation)
    │
    ▼
Client Component (React 19)
    │
    ├─► localStorage (chat persistence, namespaced by mode)
    │
    ▼
API Route (/api/*)
    │
    ├─► In-memory Bridge (event log, agents, channels, tasks)
    │
    └─► /api/proxy ──► External Backend (sessions, tasks, workspace)
```

Messages use an append-only event log with cursor-based reads. Each message is a `MessageEnvelope` with four addressing modes:

- **Direct**: `agent-id` — one specific agent
- **Role**: `@Engineering` — routed by load to available agent of that role
- **Channel**: `#code-review` — all channel members
- **Broadcast**: `*` — everyone

### Component Tree

```
RootLayout (fonts, providers)
└── SidebarProvider
    ├── AppSidebar
    │   ├── ContextSwitcher (mode-aware org/agent selector)
    │   ├── NavMain (mode-dependent navigation items)
    │   ├── Folders (workspace file browser)
    │   ├── Sessions (backend session list + CRUD)
    │   ├── Tasks (running/completed task feed)
    │   └── NavSecondary (settings, help)
    └── SidebarInset
        ├── SiteHeader
        └── Page Content (varies by route)
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Root — redirects via proxy.ts
│   ├── layout.tsx                  # Root layout (fonts, providers)
│   ├── org/                        # Org mode routes
│   │   ├── layout.tsx              # Shared sidebar layout
│   │   ├── page.tsx                # Org dashboard
│   │   ├── agents/                 # Agent management
│   │   ├── objectives/             # OKR tracking
│   │   ├── storage/                # File browser
│   │   ├── reports/                # Analytics
│   │   ├── docs/                   # Documentation
│   │   └── channel/[id]/           # Channel chat
│   ├── agent/
│   │   ├── (solo)/                 # Agent-only mode (route group)
│   │   │   ├── layout.tsx          # Agent sidebar layout
│   │   │   ├── page.tsx            # Agent dashboard
│   │   │   └── chat/               # Agent chat
│   │   └── [id]/                   # Org drill-in to specific agent
│   │       ├── layout.tsx
│   │       ├── page.tsx
│   │       ├── chat/
│   │       └── objectives/
│   └── api/
│       ├── agents/                 # Agent CRUD + heartbeat
│       ├── messages/               # Message send + cursor polling
│       ├── tasks/                  # Task lifecycle + approval
│       ├── channels/               # Channel management
│       ├── governance/             # Governance config
│       ├── stream/                 # SSE endpoints
│       ├── storage/                # File browser API
│       ├── proxy/                  # Backend proxy
│       └── lib/
│           ├── bridge.ts           # In-memory event log + state
│           ├── types.ts            # TypeScript interfaces
│           └── auth.ts             # Token auth (xo_ag_*)
├── components/
│   ├── ui/                         # shadcn/ui v4 (base-nova)
│   ├── xo/                         # XO-specific (context-switcher, command-palette)
│   ├── app-sidebar.tsx             # Mode-aware sidebar
│   └── nav-*.tsx                   # Navigation components
├── lib/
│   ├── mode.ts                     # Mode detection (getMode, isOrgMode, etc.)
│   ├── session-store.ts            # localStorage chat persistence
│   └── utils.ts                    # cn() utility
├── hooks/
│   └── use-keyboard-shortcuts.ts   # Cmd+K, navigation shortcuts
└── proxy.ts                        # Next.js 16 route-level redirects
```

---

## API Reference

All endpoints return `{ ok: boolean, data?, error? }`. Auth via `Bearer xo_ag_{id}_{hmac}`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all agents |
| POST | `/api/agents` | Register agent (returns token) |
| GET | `/api/agents/[id]` | Agent details |
| DELETE | `/api/agents/[id]` | Disconnect agent |
| PUT | `/api/agents/[id]/pulse` | Heartbeat |
| GET | `/api/messages?after={cursor}` | Poll messages (cursor-based) |
| POST | `/api/messages` | Send message (202 Accepted) |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks/[id]` | Task details |
| PATCH | `/api/tasks/[id]` | Update task status |
| POST | `/api/tasks/[id]/approve` | Approve task |
| POST | `/api/tasks/[id]/reject` | Reject task |
| GET | `/api/channels` | List channels |
| POST | `/api/channels` | Create channel |
| GET | `/api/channels/[name]/history` | Channel messages |
| GET | `/api/governance` | Get governance config |
| PATCH | `/api/governance` | Update governance config |
| GET | `/api/stream` | SSE event stream |
| GET | `/api/storage?path=` | Browse workspace files |
| GET | `/api/proxy?path=/sessions` | Proxy to backend |

---

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment config
cp .env.example .env

# Run in org mode (default)
NEXT_PUBLIC_XO_MODE=org pnpm dev

# Run in agent mode
NEXT_PUBLIC_XO_MODE=agent pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — the root automatically redirects to `/org` or `/agent` based on mode.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| UI | shadcn/ui v4 (base-nova), @base-ui/react, Tailwind CSS v4 |
| Chat | @assistant-ui/react |
| State | localStorage (chat), in-memory bridge (server), Zustand (available) |
| Tables | @tanstack/react-table |
| Charts | Recharts |
| DnD | @dnd-kit |
| Auth | Token-based (xo_ag_*) |
| Theme | Dark-only, OKLCH color space, XO Green accent |

---

## Environment Variables

See [`.env.example`](.env.example) for all options. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_XO_MODE` | `org` | `org` or `agent` |
| `NEXT_PUBLIC_XO_AGENT_ID` | `aria` | Fixed agent ID in agent mode |
| `XO_BACKEND_URL` | `http://localhost:8000` | Backend server URL |
| `XO_SERVER_SECRET` | `xo-dev-secret-change-me` | Token signing secret |
