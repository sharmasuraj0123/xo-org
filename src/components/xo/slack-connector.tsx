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
  LoaderIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
  HashIcon,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────

interface Connection {
  teamId: string
  teamName: string
  botUserId: string
  status: "connected" | "disconnected" | "revoked"
  hasUserToken: boolean
  connectedAt: number
  updatedAt: number
}

interface SlackStatus {
  configured: boolean
  connected: boolean
  connection: Connection | null
}

// Slack icon component
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.527 2.527 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.271 0a2.527 2.527 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.164 0a2.528 2.528 0 0 1 2.521 2.522v6.312zM15.164 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.164 24a2.528 2.528 0 0 1-2.521-2.522v-2.522h2.521zm0-1.271a2.527 2.527 0 0 1-2.521-2.521 2.527 2.527 0 0 1 2.521-2.521h6.314A2.528 2.528 0 0 1 24 15.164a2.528 2.528 0 0 1-2.522 2.521h-6.314z" />
    </svg>
  )
}

// ─── Component ───────────────────────────────────────────────

export function SlackConnector() {
  const [status, setStatus] = useState<SlackStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  const fetchStatus = useCallback(() => {
    setLoading(true)
    fetch("/api/slack/status")
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
    window.location.href = "/api/slack/connect?return_to=/org/connections"
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await fetch("/api/slack/disconnect", { method: "DELETE" })
      setStatus((prev) =>
        prev ? { ...prev, connected: false, connection: null } : null
      )
    } catch {
      // Ignore
    } finally {
      setDisconnecting(false)
    }
  }

  // ─── Loading ────────────────────────────────────────────────

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <SlackIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Slack</CardTitle>
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
              <SlackIcon className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle>Slack</CardTitle>
              <CardDescription>
                Slack connector is not configured. Set SLACK_CLIENT_ID and
                SLACK_CLIENT_SECRET in your environment.
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

  // ─── Not connected ──────────────────────────────────────────

  if (!status.connected || !status.connection) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <SlackIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle>Slack</CardTitle>
              <CardDescription>
                Connect your Slack workspace to let agents read channels,
                send messages, and respond to @mentions.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleConnect}>
            <SlackIcon className="size-4" />
            Add to Slack
          </Button>
        </CardContent>
      </Card>
    )
  }

  // ─── Connected ──────────────────────────────────────────────

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
            <SlackIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle>{conn.teamName}</CardTitle>
              <Badge
                variant="default"
                className="bg-primary/15 text-primary"
              >
                <CheckCircleIcon className="size-3" />
                Connected
              </Badge>
            </div>
            <CardDescription>
              Connected {connectedDate}
              {conn.hasUserToken && " \u00b7 Search enabled"}
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
                `https://app.slack.com/client/${conn.teamId}`,
                "_blank"
              )
            }
          >
            <HashIcon className="size-3.5" />
            Open Workspace
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
