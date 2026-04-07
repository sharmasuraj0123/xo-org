"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  MailIcon,
  ExternalLinkIcon,
  LoaderIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────

interface Connection {
  email: string
  displayName: string
  avatarUrl: string | null
  status: "connected" | "disconnected" | "expired"
  scopes: string[]
  connectedAt: number
  updatedAt: number
}

interface GmailStatus {
  configured: boolean
  connected: boolean
  connection: Connection | null
}

// ─── Component ───────────────────────────────────────────────

export function GmailConnector() {
  const [status, setStatus] = useState<GmailStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  const fetchStatus = useCallback(() => {
    setLoading(true)
    fetch("/api/gmail/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setStatus(data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleConnect = () => {
    window.location.href = "/api/gmail/connect?return_to=/org/connections"
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await fetch("/api/gmail/disconnect", { method: "DELETE" })
      setStatus((prev) =>
        prev ? { ...prev, connected: false, connection: null } : null
      )
    } catch {
      // Ignore
    } finally {
      setDisconnecting(false)
    }
  }

  // ─── Loading state ──────────────────────────────────────────

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <MailIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Gmail</CardTitle>
              <CardDescription>Loading connection status...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  // ─── Not configured ─────────────────────────────────────────

  if (!status?.configured) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <MailIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Gmail</CardTitle>
              <CardDescription>
                Gmail connector is not configured. Set GOOGLE_CLIENT_ID and
                GOOGLE_CLIENT_SECRET in your environment.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant="outline">Not Configured</Badge>
        </CardContent>
      </Card>
    )
  }

  // ─── Expired / Revoked ──────────────────────────────────────

  if (status.connection?.status === "expired") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <MailIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle>{status.connection.email}</CardTitle>
                <Badge variant="destructive">
                  <AlertTriangleIcon className="size-3" />
                  Expired
                </Badge>
              </div>
              <CardDescription>
                Access was revoked or the token expired. Reconnect to restore
                access.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button onClick={handleConnect}>
              <RefreshCwIcon className="size-4" />
              Reconnect
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <LoaderIcon className="size-3.5 animate-spin" />
              ) : (
                <XCircleIcon className="size-3.5" />
              )}
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── Not connected ──────────────────────────────────────────

  if (!status.connected || !status.connection) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <MailIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle>Gmail</CardTitle>
              <CardDescription>
                Connect your Google account to let agents read, search, send,
                and manage emails.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect}>
            <MailIcon className="size-4" />
            Connect Gmail
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ─── Connected state ────────────────────────────────────────

  const conn = status.connection
  const connectedDate = new Date(conn.connectedAt).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric" }
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
            {conn.avatarUrl ? (
              <img
                src={conn.avatarUrl}
                alt={conn.displayName}
                className="size-10 rounded-lg"
              />
            ) : (
              <MailIcon className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle>{conn.displayName}</CardTitle>
              <Badge
                variant="default"
                className="bg-primary/15 text-primary"
              >
                <CheckCircleIcon className="size-3" />
                Connected
              </Badge>
            </div>
            <CardDescription>
              {conn.email} &middot; Connected {connectedDate}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                "https://myaccount.google.com/permissions",
                "_blank"
              )
            }
          >
            <ExternalLinkIcon className="size-3.5" />
            Manage Permissions
          </Button>
          <Button variant="outline" size="sm" onClick={fetchStatus}>
            <RefreshCwIcon className="size-3.5" />
            Refresh
          </Button>
          <div className="flex-1" />
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            {disconnecting ? (
              <LoaderIcon className="size-3.5 animate-spin" />
            ) : (
              <XCircleIcon className="size-3.5" />
            )}
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
