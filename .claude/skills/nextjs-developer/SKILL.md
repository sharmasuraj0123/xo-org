# Next.js 16 Developer Skill

## Overview

You are an expert Next.js 16 developer. This project uses **Next.js 16.2.0** with the App Router, React 19, TypeScript 5, and Tailwind CSS v4.

## Critical: Read the Bundled Docs First

Next.js 16 has breaking changes from prior versions. **Before writing or modifying any Next.js code**, consult the docs shipped with this project:

```
node_modules/next/dist/docs/01-app/
```

Key doc paths:
- `01-getting-started/` — project structure, installation
- `02-guides/` — data fetching, forms, caching, auth, etc.
- `03-api-reference/01-directives/` — `"use client"`, `"use server"`, `"use cache"`
- `03-api-reference/02-components/` — `<Link>`, `<Image>`, `<Script>`, `<Form>`
- `03-api-reference/03-file-conventions/` — `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `route.ts`
- `03-api-reference/04-functions/` — `cookies()`, `headers()`, `redirect()`, `notFound()`, `generateMetadata()`
- `03-api-reference/05-config/` — `next.config.ts`

**Always verify API signatures against these docs before using them.** Your training data may contain outdated patterns.

## Architecture Rules

### Server Components (default)
- All components in the `app/` directory are **React Server Components** by default
- Server Components can `async/await` and fetch data directly
- Server Components **cannot** use hooks (`useState`, `useEffect`, etc.), browser APIs, or event handlers
- Keep as much logic as possible in Server Components for performance

### Client Components
- Add `"use client"` directive at the top of the file only when you need interactivity
- Push `"use client"` as far down the component tree as possible
- Client Components **cannot** be async — they cannot directly await data
- Client Components can import Server Components as children via props

### Server Actions
- Use `"use server"` directive for server-side mutations
- Server Actions can be called from Client Components via form actions or `startTransition`
- Always validate inputs with Zod or similar on the server side
- Return structured responses, not thrown errors

### File Conventions (App Router)
```
src/app/
├── layout.tsx          # Root layout (Server Component)
├── page.tsx            # Home page
├── globals.css         # Global styles (Tailwind v4)
├── (dashboard)/        # Route group (no URL segment)
│   ├── layout.tsx      # Dashboard layout with sidebar
│   ├── page.tsx        # Dashboard home
│   ├── settings/page.tsx
│   ├── messages/page.tsx
│   ├── agents/page.tsx
│   └── channels/[name]/page.tsx  # Dynamic route
└── dashboard/page.tsx  # Standalone dashboard route
```

### Route Groups
- Use `(folderName)` for logical grouping without affecting the URL
- Useful for applying different layouts to different sections
- This project uses `(dashboard)` for the sidebar layout

### Dynamic Routes
- `[param]` for single dynamic segments
- `[...slug]` for catch-all routes
- `[[...slug]]` for optional catch-all routes

## Data Patterns

### Fetching in Server Components
```tsx
// page.tsx (Server Component — no "use client")
export default async function Page() {
  const data = await fetchSomeData()
  return <MyComponent data={data} />
}
```

### Streaming with Suspense
```tsx
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function Page() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <AsyncDataComponent />
    </Suspense>
  )
}
```

### Loading UI
- `loading.tsx` files automatically wrap the page in a Suspense boundary
- Use for route-level loading states

### Error Handling
- `error.tsx` files catch errors at the route segment level
- Must be Client Components (`"use client"`)
- Receive `error` and `reset` props

## Performance Guidelines

- Use `<Image>` from `next/image` for all images (auto-optimization)
- Use `<Link>` from `next/link` for client-side navigation (auto-prefetching)
- Use `next/font` for font optimization (this project uses Geist and Geist Mono)
- Leverage route-level code splitting — each page is automatically a separate bundle
- Use `loading.tsx` for instant loading states
- Prefer Server Components to minimize client-side JS

## TypeScript Conventions

- Use `type` imports for type-only imports: `import type { Metadata } from "next"`
- Define props interfaces for all components
- Use `Readonly<{ children: React.ReactNode }>` for layout props
- Enable strict mode (already configured in `tsconfig.json`)

## Common Mistakes to Avoid

1. **Don't use `"use client"` unnecessarily** — only add it when the component needs interactivity
2. **Don't fetch data in Client Components when a Server Component parent can do it** — pass data down as props
3. **Don't use `useEffect` for data fetching** — use Server Components or Server Actions
4. **Don't import server-only code in Client Components** — this will leak secrets to the client
5. **Don't use `router.push()` for simple navigation** — use `<Link>` instead
6. **Don't forget to check `node_modules/next/dist/docs/`** — APIs may have changed in Next.js 16
