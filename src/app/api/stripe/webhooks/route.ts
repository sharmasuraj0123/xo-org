import { NextResponse } from "next/server"
import { verifyStripeWebhook } from "../../lib/stripe"
import { updateConnectionStatus } from "../../lib/stripe-store"
import { appendMessage, notifySubscribers } from "../../lib/bridge"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")

  const valid = await verifyStripeWebhook(body, signature)
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 })
  }

  const event = JSON.parse(body)
  const eventType = event.type as string

  switch (eventType) {
    case "account.deauthorized": {
      const accountId = event.account as string
      if (accountId) updateConnectionStatus(accountId, "revoked")
      break
    }
    case "charge.succeeded":
    case "charge.failed": {
      const charge = event.data.object
      const msg = appendMessage("stripe", "#general", "tell", {
        text: `Charge ${eventType === "charge.succeeded" ? "succeeded" : "failed"}: ${(charge.amount / 100).toFixed(2)} ${charge.currency.toUpperCase()}`,
        metadata: { stripeEvent: eventType, chargeId: charge.id, amount: charge.amount, currency: charge.currency },
      })
      notifySubscribers(msg)
      break
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object
      const msg = appendMessage("stripe", "#general", "tell", {
        text: `Invoice ${eventType === "invoice.paid" ? "paid" : "payment failed"}: ${(invoice.amount_due / 100).toFixed(2)} ${invoice.currency.toUpperCase()}`,
        metadata: { stripeEvent: eventType, invoiceId: invoice.id },
      })
      notifySubscribers(msg)
      break
    }
    case "payout.paid": {
      const payout = event.data.object
      const msg = appendMessage("stripe", "#general", "tell", {
        text: `Payout completed: ${(payout.amount / 100).toFixed(2)} ${payout.currency.toUpperCase()}`,
        metadata: { stripeEvent: eventType, payoutId: payout.id },
      })
      notifySubscribers(msg)
      break
    }
  }

  return NextResponse.json({ received: true })
}
