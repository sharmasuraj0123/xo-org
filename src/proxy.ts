import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Lightweight route-level proxy (Next.js 16).
 * Handles root redirect and blocks /org/* in agent-only mode.
 * No auth logic here — just routing.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const mode = process.env.NEXT_PUBLIC_XO_MODE || "org"

  // Root → redirect to /org or /agent
  if (pathname === "/") {
    const target = mode === "agent" ? "/agent" : "/org"
    return NextResponse.redirect(new URL(target, request.url))
  }

  // In agent-only mode, block /org/* and /agents* routes
  if (mode === "agent") {
    if (pathname.startsWith("/org") || pathname.startsWith("/agents")) {
      return NextResponse.redirect(new URL("/agent", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/org/:path*", "/agents/:path*"],
}
