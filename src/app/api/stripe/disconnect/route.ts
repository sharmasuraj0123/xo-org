import { NextResponse } from "next/server"
import { deauthorizeStripeAccount } from "../../lib/stripe"
import { getActiveConnection, removeConnection } from "../../lib/stripe-store"

export async function DELETE() {
  const connection = getActiveConnection()
  if (!connection) {
    return NextResponse.json({ ok: false, error: "No active Stripe connection" }, { status: 404 })
  }

  try {
    await deauthorizeStripeAccount(connection.stripeUserId)
  } catch (err) {
    console.error("Failed to deauthorize Stripe:", err)
  }

  removeConnection(connection.stripeUserId)
  return NextResponse.json({ ok: true, data: { disconnected: true } })
}
