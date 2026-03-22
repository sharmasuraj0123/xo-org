# XO Org — Project Conventions

## Project Identity

**XO Org** is an agent collaboration tracking board. It's a dark-themed, sidebar-driven dashboard application.

## Directory Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (Geist fonts, TooltipProvider)
│   ├── page.tsx                # Landing / home page
│   ├── globals.css             # Tailwind v4 imports + OKLCH theme
│   ├── dashboard/page.tsx      # Standalone dashboard route
│   └── (dashboard)/            # Route group — sidebar layout
│       ├── layout.tsx          # SidebarProvider + AppSidebar + SidebarInset
│       ├── page.tsx            # Dashboard home
│       ├── settings/page.tsx
│       ├── messages/page.tsx
│       ├── agents/page.tsx
│       └── channels/[name]/page.tsx
├── components/
│   ├── ui/                     # shadcn/ui components (DO NOT edit manually)
│   ├── xo/                     # XO-specific composed components
│   │   ├── app-sidebar.tsx     # Main sidebar component
│   │   └── logo.tsx            # XO logo
│   ├── app-sidebar.tsx         # Legacy sidebar (prefer xo/app-sidebar.tsx)
│   ├── nav-main.tsx            # Main navigation items
│   ├── nav-user.tsx            # User nav section
│   ├── nav-projects.tsx        # Projects nav section
│   └── team-switcher.tsx       # Team/workspace switcher
├── hooks/
│   └── use-mobile.ts           # Mobile detection hook
└── lib/
    ├── utils.ts                # cn() utility
    └── mock-data.ts            # Mock data for development
```

## Component Organization

### `components/ui/`
Managed by shadcn CLI. **Never manually edit** files in this directory. To customize, either:
1. Extend via wrapper components in `components/xo/`
2. Use `className` prop overrides at the usage site

### `components/xo/`
XO-specific components that compose shadcn primitives. This is where custom business components live. Name files descriptively: `app-sidebar.tsx`, `agent-card.tsx`, `channel-list.tsx`, etc.

### Other `components/` files
Legacy components at the root level. New components should go in `components/xo/`.

## Code Style

### Imports
Use path aliases consistently:
```tsx
import { Button } from "@/components/ui/button"
import { AppSidebar } from "@/components/xo/app-sidebar"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
```

### Naming
- **Files:** kebab-case (`app-sidebar.tsx`, `mock-data.ts`)
- **Components:** PascalCase (`AppSidebar`, `NavMain`)
- **Hooks:** camelCase with `use` prefix (`useMobile`)
- **Utilities:** camelCase (`cn`, `formatDate`)

### Component Definitions
- Use function declarations for components (not arrow functions for exports)
- Use `React.ComponentProps<"element">` for extending native elements
- Export at the bottom of the file or use named exports

### Server vs Client
- Dashboard pages should be Server Components by default
- Add `"use client"` only for interactive components (forms, toggles, sidebars)
- The sidebar and its related components are Client Components (they need interactivity)

## Brand Guidelines

- **Primary color:** XO Green (`#41FF00` / `oklch(0.82 0.22 140)`)
- **Background:** Near-black (`oklch(0.098 0.005 250)`)
- **Aesthetic:** Dark, minimal, developer-focused
- **Font:** Geist (sans) and Geist Mono (code)
- **Tone:** Professional but approachable, agent/AI-focused

## Development Workflow

### Running the dev server
```bash
npm run dev
```

### Adding shadcn components
```bash
npx shadcn@latest add <component>
```

### Linting
```bash
npm run lint
```

### Building
```bash
npm run build
```

## Key Decisions

1. **Dark-only theme** — No light mode. All designs should look great on dark backgrounds.
2. **App Router only** — No Pages Router. All routes use the `app/` directory.
3. **Server Components first** — Default to RSC. Only opt into client when needed.
4. **shadcn base-nova** — Uses `@base-ui/react`, not Radix. Don't mix primitives.
5. **Route groups for layouts** — `(dashboard)` provides the sidebar layout.
6. **XO namespace** — Custom components go in `components/xo/`.
