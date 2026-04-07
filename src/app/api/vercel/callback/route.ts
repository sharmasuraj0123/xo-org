import { NextResponse } from "next/server"
import { exchangeVercelCode, fetchVercelUser, isVercelConfigured } from "../../lib/vercel"
import { saveConnection } from "../../lib/vercel-store"

export async function GET(req: Request) {
  if (!isVercelConfigured()) {
    return NextResponse.json({ ok: false, error: "Vercel not configured" }, { status: 503 })
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const stateParam = searchParams.get("state")

  let returnTo = "/org/connections"
  if (stateParam) {
    try {
      const state = JSON.parse(Buffer.from(stateParam, "base64url").toString())
      if (state.returnTo) returnTo = state.returnTo
    } catch { /* ignore */ }
  }

  if (!code) {
    const url = new URL(returnTo, req.url)
    url.searchParams.set("vercel", "error")
    return NextResponse.redirect(url)
  }

  try {
    const tokens = await exchangeVercelCode(code)
    const profile = await fetchVercelUser(tokens.access_token)

    await saveConnection(
      tokens.access_token,
      tokens.team_id,
      tokens.installation_id,
      tokens.configuration_id ?? null,
      profile.username,
      profile.email
    )

    const url = new URL(returnTo, req.url)
    url.searchParams.set("vercel", "connected")
    return NextResponse.redirect(url)
  } catch (err) {
    console.error("Vercel callback error:", err)
    const url = new URL(returnTo, req.url)
    url.searchParams.set("vercel", "error")
    return NextResponse.redirect(url)
  }
}
