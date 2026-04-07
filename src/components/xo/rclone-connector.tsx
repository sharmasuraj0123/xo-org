"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LoaderIcon, CheckCircleIcon, XCircleIcon,
  RefreshCwIcon, HardDriveIcon, FolderSyncIcon,
} from "lucide-react"

interface Remote {
  name: string
  type: string
}

interface Connection {
  rcloneVersion: string
  configPath: string
  remotes: Remote[]
  status: "connected" | "disconnected"
  connectedAt: number
}

interface RcloneStatus {
  connected: boolean
  connection: Connection | null
}

export function RcloneConnector() {
  const [status, setStatus] = useState<RcloneStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(() => {
    setLoading(true)
    fetch("/api/rclone/status")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setStatus(data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const res = await fetch("/api/rclone/connect", { method: "POST" })
      const data = await res.json()
      if (data.ok) {
        setStatus({ connected: true, connection: data.data })
      } else {
        setError(data.error ?? "Failed to connect")
      }
    } catch {
      setError("Failed to connect to rclone")
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await fetch("/api/rclone/disconnect", { method: "DELETE" })
      setStatus({ connected: false, connection: null })
    } catch { /* ignore */ } finally { setDisconnecting(false) }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <HardDriveIcon className="size-5 text-muted-foreground" />
            </div>
            <div><CardTitle>Rclone</CardTitle><CardDescription>Loading...</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!status?.connected || !status.connection) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <HardDriveIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle>Rclone</CardTitle>
              <CardDescription>
                Connect rclone to let agents manage files across cloud storage
                remotes — S3, Google Drive, Dropbox, and 70+ providers.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting
                ? <LoaderIcon className="size-4 animate-spin" />
                : <FolderSyncIcon className="size-4" />}
              {connecting ? "Detecting..." : "Connect Rclone"}
            </Button>
          </div>
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
            <HardDriveIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle>Rclone</CardTitle>
              <Badge variant="default" className="bg-primary/15 text-primary">
                <CheckCircleIcon className="size-3" />
                Connected
              </Badge>
              <Badge variant="outline">{conn.rcloneVersion}</Badge>
            </div>
            <CardDescription>
              {conn.remotes.length} remote{conn.remotes.length !== 1 ? "s" : ""} configured &middot; Connected {connectedDate}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {conn.remotes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {conn.remotes.map((r) => (
              <Badge key={r.name} variant="outline" className="text-xs">
                {r.name} <span className="ml-1 text-muted-foreground">({r.type})</span>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
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
