import { NextResponse } from "next/server"
import { isStripeConfigured } from "../../lib/stripe"
import { getActiveConnection } from "../../lib/stripe-store"

export async function GET() {
  if (!isStripeConfigured()) {
    return NextResponse.json({
      ok: true,
      data: { configured: false, connected: false, connection: null },
    })
  }

  const connection = getActiveConnection()

  return NextResponse.json({
    ok: true,
    data: {
      configured: true,
      connected: connection?.status === "connected",
      connection: connection
        ? {
            stripeUserId: connection.stripeUserId,
            businessName: connection.businessName,
            email: connection.email,
            scope: connection.scope,
            livemode: connection.livemode,
            status: connection.status,
            connectedAt: connection.connectedAt,
          }
        : null,
    },
  })
}
