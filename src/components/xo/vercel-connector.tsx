"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LoaderIcon, CheckCircleIcon, XCircleIcon,
  RefreshCwIcon, ExternalLinkIcon, TriangleIcon,
} from "lucide-react"

interface Connection {
  username: string
  email: string
  teamId: string | null
  installationId: string
  status: "connected" | "disconnected" | "uninstalled"
  connectedAt: number
}

interface VercelStatus {
  configured: boolean
  connected: boolean
  connection: Connection | null
}

export function VercelConnector() {
  const [status, setStatus] = useState<VercelStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  const fetchStatus = useCallback(() => {
    setLoading(true)
    fetch("/api/vercel/status")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setStatus(data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleConnect = () => {
    window.location.href = "/api/vercel/connect?return_to=/org/connections"
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await fetch("/api/vercel/disconnect", { method: "DELETE" })
      setStatus((prev) => prev ? { ...prev, connected: false, connection: null } : null)
    } catch { /* ignore */ } finally { setDisconnecting(false) }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <TriangleIcon className="size-5 text-muted-foreground" />
            </div>
            <div><CardTitle>Vercel</CardTitle><CardDescription>Loading...</CardDescription></div>
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
              <TriangleIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Vercel</CardTitle>
              <CardDescription>
                Vercel connector is not configured. Set VERCEL_CLIENT_ID and
                VERCEL_CLIENT_SECRET in your environment.
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
              <TriangleIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle>Vercel</CardTitle>
              <CardDescription>
                Connect your Vercel account to let agents manage projects,
                deployments, environment variables, and domains.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect}>
            <TriangleIcon className="size-4" />
            Connect Vercel
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
            <TriangleIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle>{conn.username}</CardTitle>
              <Badge variant="default" className="bg-primary/15 text-primary">
                <CheckCircleIcon className="size-3" />
                Connected
              </Badge>
              {conn.teamId && <Badge variant="outline">Team</Badge>}
            </div>
            <CardDescription>
              {conn.email} &middot; Connected {connectedDate}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"
            onClick={() => window.open("https://vercel.com/dashboard", "_blank")}
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
