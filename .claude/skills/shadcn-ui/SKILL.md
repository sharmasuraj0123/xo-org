# shadcn/ui v4 Skill — Base Nova Style

## Overview

This project uses **shadcn v4.1.0** with the **base-nova** style, built on **@base-ui/react** primitives (NOT Radix UI). Tailwind CSS v4 with OKLCH color system. Dark-first design.

## Key Differences from Older shadcn

- **base-nova** style uses `@base-ui/react` primitives, not `@radix-ui/*`
- Import patterns are different: `import { Button as ButtonPrimitive } from "@base-ui/react/button"`
- Components use `data-slot` attributes for styling hooks
- Tailwind CSS v4 syntax: `@import "tailwindcss"` instead of `@tailwind` directives
- OKLCH color values in CSS variables

## Project Configuration

From `components.json`:
```json
{
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

## Adding New Components

Use the CLI to add shadcn components:
```bash
npx shadcn@latest add <component-name>
```

Available components include: accordion, alert, alert-dialog, badge, breadcrumb, button, calendar, card, carousel, checkbox, collapsible, command, context-menu, data-table, dialog, drawer, dropdown-menu, form, hover-card, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, switch, table, tabs, textarea, toast, toggle, toggle-group, tooltip.

**Never manually create UI component files** — always use the CLI so you get the correct base-nova primitives.

## Component Patterns

### Styling with CVA (Class Variance Authority)
All component variants use CVA. Follow this pattern:
```tsx
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const myComponentVariants = cva(
  "base-classes-here",
  {
    variants: {
      variant: {
        default: "...",
        secondary: "...",
      },
      size: {
        default: "...",
        sm: "...",
        lg: "...",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

### Composing Components
```tsx
import { cn } from "@/lib/utils"

function MyComponent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("base-styles", className)} {...props} />
}
```

### data-slot Pattern
shadcn base-nova components use `data-slot` for identification:
```tsx
<ButtonPrimitive data-slot="button" className={cn(...)} {...props} />
```

Use `data-slot` selectors in Tailwind for parent-aware styling:
```
has-data-[slot=icon]:pl-2
in-data-[slot=button-group]:rounded-lg
```

## Theme & Design Tokens

### Color System (OKLCH, dark-first)
This project uses a dark-first theme. All colors are defined as OKLCH values in `globals.css`:

- **Primary (XO Green):** `oklch(0.82 0.22 140)` — bright green, the brand accent
- **Background:** `oklch(0.098 0.005 250)` — near-black
- **Foreground:** `oklch(0.95 0 0)` — near-white
- **Card:** `oklch(0.13 0.005 250)` — slightly lighter than background
- **Muted:** `oklch(0.18 0.005 250)` — for secondary surfaces
- **Muted Foreground:** `oklch(0.6 0 0)` — for secondary text
- **Border:** `oklch(1 0 0 / 8%)` — subtle white borders
- **Destructive:** `oklch(0.65 0.2 25)` — red tones

### Custom XO Colors
```css
--color-xo-green: #41FF00;
--color-xo-green-muted: #83d63a;
--color-xo-charcoal: #08090A;
```
Use as: `text-xo-green`, `bg-xo-charcoal`, etc.

### Border Radius
Base radius is `0.625rem`. Scaled variants:
- `rounded-sm` = `calc(0.625rem * 0.6)`
- `rounded-md` = `calc(0.625rem * 0.8)`
- `rounded-lg` = `0.625rem`
- `rounded-xl` = `calc(0.625rem * 1.4)`

### Typography
- Sans: Geist (`--font-geist-sans`)
- Mono: Geist Mono (`--font-geist-mono`)
- Heading: Same as sans

## Tailwind CSS v4 Syntax

### Import Pattern
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

### Custom Variants
```css
@custom-variant dark (&:is(.dark *));
```

### Theme Inline
Use `@theme inline {}` to bridge CSS variables to Tailwind utilities:
```css
@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  /* ... */
}
```

## Icons

Use **Lucide React** for all icons:
```tsx
import { Settings, ChevronRight, Plus } from "lucide-react"

<Settings className="size-4" />
```

## Layout Components Already Available

The project has these shadcn components installed:
- **Sidebar** (SidebarProvider, SidebarInset, SidebarTrigger, AppSidebar)
- **Button** (with variants: default, outline, secondary, ghost, destructive, link)
- **Card**, **Badge**, **Avatar**, **Tabs**
- **Sheet**, **Scroll Area**, **Tooltip**, **Breadcrumb**
- **Separator**, **Collapsible**, **Dropdown Menu**
- **Input**, **Skeleton**

## Common Patterns

### Page Layout (inside dashboard)
```tsx
export default function SomePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Page Title</h1>
        <Button>Action</Button>
      </div>
      {/* Content */}
    </div>
  )
}
```

### Card Grid
```tsx
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
  <Card>
    <CardHeader>
      <CardTitle>Title</CardTitle>
      <CardDescription>Description</CardDescription>
    </CardHeader>
    <CardContent>...</CardContent>
  </Card>
</div>
```

### Do NOT
- Do not install `@radix-ui/*` packages — this project uses `@base-ui/react`
- Do not create UI components manually — use `npx shadcn@latest add`
- Do not use hex colors for theme tokens — use the OKLCH variables
- Do not add a light mode theme unless explicitly asked — this is dark-first
- Do not use `className="dark"` on `<html>` — the dark theme is the default (and only) theme
