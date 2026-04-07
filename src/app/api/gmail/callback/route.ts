import { NextResponse } from "next/server"
import {
  exchangeCode,
  fetchUserProfile,
  isGmailConfigured,
} from "../../lib/gmail"
import { saveConnection } from "../../lib/gmail-store"

/**
 * GET /api/gmail/callback
 *
 * Handles the redirect from Google after OAuth consent.
 * Google sends: ?code=xxx&state=yyy
 *
 * We exchange the code for tokens, fetch the user profile,
 * store everything encrypted, and redirect back.
 */
export async function GET(req: Request) {
  if (!isGmailConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Gmail connector is not configured" },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const stateParam = searchParams.get("state")
  const error = searchParams.get("error")

  // User denied access
  if (error) {
    let returnTo = "/org/connections"
    if (stateParam) {
      try {
        const state = JSON.parse(
          Buffer.from(stateParam, "base64url").toString()
        )
        if (state.returnTo) returnTo = state.returnTo
      } catch {
        // Ignore
      }
    }
    const url = new URL(returnTo, req.url)
    url.searchParams.set("gmail", "denied")
    return NextResponse.redirect(url)
  }

  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Missing authorization code" },
      { status: 400 }
    )
  }

  // Decode state for return URL
  let returnTo = "/org/connections"
  if (stateParam) {
    try {
      const state = JSON.parse(
        Buffer.from(stateParam, "base64url").toString()
      )
      if (state.returnTo) returnTo = state.returnTo
    } catch {
      // Ignore malformed state
    }
  }

  try {
    // Exchange authorization code for tokens
    const tokens = await exchangeCode(code)

    if (!tokens.refresh_token) {
      const url = new URL(returnTo, req.url)
      url.searchParams.set("gmail", "error")
      url.searchParams.set("gmail_error", "no_refresh_token")
      return NextResponse.redirect(url)
    }

    // Fetch user profile
    const profile = await fetchUserProfile(tokens.access_token)

    // Store the connection with encrypted tokens
    await saveConnection(
      profile.email,
      profile.name,
      profile.picture,
      tokens.refresh_token,
      tokens.access_token,
      tokens.expires_in,
      tokens.scope.split(" ")
    )

    // Redirect back with success
    const url = new URL(returnTo, req.url)
    url.searchParams.set("gmail", "connected")
    return NextResponse.redirect(url)
  } catch (err) {
    console.error("Gmail callback error:", err)
    const url = new URL(returnTo, req.url)
    url.searchParams.set("gmail", "error")
    return NextResponse.redirect(url)
  }
}
