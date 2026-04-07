"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CreditCardIcon, LoaderIcon, CheckCircleIcon, XCircleIcon,
  RefreshCwIcon, ExternalLinkIcon, AlertTriangleIcon,
} from "lucide-react"

interface Connection {
  stripeUserId: string
  businessName: string
  email: string
  scope: "read_write" | "read_only"
  livemode: boolean
  status: "connected" | "disconnected" | "revoked"
  connectedAt: number
}

interface StripeStatus {
  configured: boolean
  connected: boolean
  connection: Connection | null
}

export function StripeConnector() {
  const [status, setStatus] = useState<StripeStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  const fetchStatus = useCallback(() => {
    setLoading(true)
    fetch("/api/stripe/status")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setStatus(data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleConnect = () => {
    window.location.href = "/api/stripe/connect?return_to=/org/connections"
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await fetch("/api/stripe/disconnect", { method: "DELETE" })
      setStatus((prev) => prev ? { ...prev, connected: false, connection: null } : null)
    } catch { /* ignore */ } finally { setDisconnecting(false) }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <CreditCardIcon className="size-5 text-muted-foreground" />
            </div>
            <div><CardTitle>Stripe</CardTitle><CardDescription>Loading...</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!status?.configured) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <CreditCardIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Stripe</CardTitle>
              <CardDescription>
                Stripe connector is not configured. Set STRIPE_SECRET_KEY and
                STRIPE_CLIENT_ID in your environment.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent><Badge variant="outline">Not Configured</Badge></CardContent>
      </Card>
    )
  }

  if (!status.connected || !status.connection) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <CreditCardIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle>Stripe</CardTitle>
              <CardDescription>
                Connect your Stripe account to let agents view customers,
                charges, invoices, and manage payments.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect}>
            <CreditCardIcon className="size-4" />
            Connect with Stripe
          </Button>
        </CardContent>
      </Card>
    )
  }

  const conn = status.connection
  const connectedDate = new Date(conn.connectedAt).toLocaleDateString(
    undefined, { month: "short", day: "numeric", year: "numeric" }
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
            <CreditCardIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle>{conn.businessName || conn.email || conn.stripeUserId}</CardTitle>
              <Badge variant="default" className="bg-primary/15 text-primary">
                <CheckCircleIcon className="size-3" />
                Connected
              </Badge>
              {conn.livemode ? (
                <Badge variant="destructive">
                  <AlertTriangleIcon className="size-3" />
                  Live
                </Badge>
              ) : (
                <Badge variant="outline">Test Mode</Badge>
              )}
            </div>
            <CardDescription>
              {conn.stripeUserId} &middot; {conn.scope} &middot; Connected {connectedDate}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"
            onClick={() => window.open("https://dashboard.stripe.com", "_blank")}
          >
            <ExternalLinkIcon className="size-3.5" />
            Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={fetchStatus}>
            <RefreshCwIcon className="size-3.5" />
            Refresh
          </Button>
          <div className="flex-1" />
          <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
            {disconnecting ? <LoaderIcon className="size-3.5 animate-spin" /> : <XCircleIcon className="size-3.5" />}
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
