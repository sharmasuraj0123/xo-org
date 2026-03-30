import { NextRequest, NextResponse } from "next/server"

/**
 * Proxy to the XO Agent backend server on port 8000.
 * Avoids CORS issues and centralizes the backend URL.
 *
 * Usage: /api/proxy?path=/sessions
 *        /api/proxy?path=/tasks
 *        /api/proxy?path=/health
 */

const mode = process.env.NEXT_PUBLIC_XO_MODE || "org"
const BACKEND_URL = mode === "agent"
  ? (process.env.XO_AGENT_BACKEND_URL || process.env.XO_BACKEND_URL || "http://localhost:8000")
  : (process.env.XO_BACKEND_URL || "http://localhost:8000")

export async function GET(request: NextRequest) {
  const backendPath = request.nextUrl.searchParams.get("path") || "/health"
  try {
    const res = await fetch(`${BACKEND_URL}${backendPath}`, {
      headers: { "Content-Type": "application/json" },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: "Backend unreachable", backend: BACKEND_URL },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  const backendPath = request.nextUrl.searchParams.get("path") || "/sessions"
  try {
    const body = await request.json().catch(() => ({}))
    const res = await fetch(`${BACKEND_URL}${backendPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: "Backend unreachable", backend: BACKEND_URL },
      { status: 502 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const backendPath = request.nextUrl.searchParams.get("path") || "/"
  try {
    const res = await fetch(`${BACKEND_URL}${backendPath}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: "Backend unreachable", backend: BACKEND_URL },
      { status: 502 }
    )
  }
}
