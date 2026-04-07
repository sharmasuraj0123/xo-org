"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LoaderIcon, CheckCircleIcon, XCircleIcon, RefreshCwIcon,
  PlusIcon, CpuIcon, WrenchIcon, Trash2Icon,
} from "lucide-react"

interface McpServer {
  id: string
  name: string
  serverName: string
  serverVersion: string
  transport: "http" | "stdio"
  toolCount: number
  status: "connected" | "disconnected" | "error"
  error?: string
  connectedAt: number
}

interface McpStatus {
  connected: boolean
  servers: McpServer[]
}

type FormTransport = "http" | "stdio"

export function McpConnector() {
  const [status, setStatus] = useState<McpStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [transport, setTransport] = useState<FormTransport>("http")
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [command, setCommand] = useState("")
  const [args, setArgs] = useState("")

  const fetchStatus = useCallback(() => {
    setLoading(true)
    fetch("/api/mcp/status")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setStatus(data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const resetForm = () => {
    setName("")
    setUrl("")
    setApiKey("")
    setCommand("")
    setArgs("")
    setError(null)
  }

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)

    const body: Record<string, unknown> = { name: name || undefined, transport }
    if (transport === "http") {
      if (!url) { setError("Server URL is required"); setConnecting(false); return }
      body.url = url
      if (apiKey) body.apiKey = apiKey
    } else {
      if (!command) { setError("Command is required"); setConnecting(false); return }
      body.command = command
      if (args.trim()) body.args = args.split(/\s+/)
    }

    try {
      const res = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.ok) {
        setShowForm(false)
        resetForm()
        fetchStatus()
      } else {
        setError(data.error ?? "Failed to connect")
      }
    } catch {
      setError("Failed to connect to MCP server")
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async (id: string) => {
    try {
      await fetch(`/api/mcp/disconnect?id=${id}`, { method: "DELETE" })
      fetchStatus()
    } catch { /* ignore */ }
  }

  // ─── Loading ──────────────────────────────────────────────

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
              <CpuIcon className="size-5 text-muted-foreground" />
            </div>
            <div><CardTitle>MCP Servers</CardTitle><CardDescription>Loading...</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const servers = status?.servers ?? []
  const connectedCount = servers.filter((s) => s.status === "connected").length
  const totalTools = servers.reduce((sum, s) => sum + (s.status === "connected" ? s.toolCount : 0), 0)

  // ─── Main Render ──────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
            <CpuIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle>MCP Servers</CardTitle>
              {connectedCount > 0 && (
                <Badge variant="default" className="bg-primary/15 text-primary">
                  <CheckCircleIcon className="size-3" />
                  {connectedCount} connected
                </Badge>
              )}
            </div>
            <CardDescription>
              {connectedCount > 0
                ? `${totalTools} tool${totalTools !== 1 ? "s" : ""} available from ${connectedCount} server${connectedCount !== 1 ? "s" : ""}`
                : "Connect custom MCP servers to extend agent capabilities with any tools."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Connected servers list */}
        {servers.length > 0 && (
          <div className="flex flex-col gap-2">
            {servers.map((server) => (
              <div
                key={server.id}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <WrenchIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{server.serverName}</span>
                  <span className="ml-1.5 text-muted-foreground">
                    {server.serverVersion}
                  </span>
                  {server.status === "connected" && (
                    <span className="ml-1.5 text-muted-foreground">
                      &middot; {server.toolCount} tool{server.toolCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  {server.transport}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 shrink-0"
                  onClick={() => handleDisconnect(server.id)}
                >
                  <Trash2Icon className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add server form */}
        {showForm && (
          <div className="flex flex-col gap-2.5 rounded-md border p-3">
            {/* Transport toggle */}
            <div className="flex gap-1 rounded-md bg-muted/60 p-0.5">
              <button
                className={`flex-1 rounded px-3 py-1 text-xs font-medium transition-colors ${
                  transport === "http" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTransport("http")}
              >
                HTTP
              </button>
              <button
                className={`flex-1 rounded px-3 py-1 text-xs font-medium transition-colors ${
                  transport === "stdio" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTransport("stdio")}
              >
                Stdio
              </button>
            </div>

            <input
              className="rounded-md border bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Display name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            {transport === "http" ? (
              <>
                <input
                  className="rounded-md border bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Server URL — e.g. http://localhost:3001/mcp"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <input
                  className="rounded-md border bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="API key (optional)"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </>
            ) : (
              <>
                <input
                  className="rounded-md border bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Command — e.g. npx -y @modelcontextprotocol/server-filesystem"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                />
                <input
                  className="rounded-md border bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Arguments (space-separated, optional)"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                />
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleConnect} disabled={connecting}>
                {connecting
                  ? <LoaderIcon className="size-3.5 animate-spin" />
                  : <CheckCircleIcon className="size-3.5" />}
                {connecting ? "Connecting..." : "Connect"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowForm(false); resetForm() }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {!showForm && (
            <Button
              variant={servers.length > 0 ? "outline" : "default"}
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <PlusIcon className="size-3.5" />
              Add MCP Server
            </Button>
          )}
          {servers.length > 0 && (
            <Button variant="outline" size="sm" onClick={fetchStatus}>
              <RefreshCwIcon className="size-3.5" />
              Refresh
            </Button>
          )}
          {servers.length > 1 && (
            <>
              <div className="flex-1" />
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await fetch("/api/mcp/disconnect", { method: "DELETE" })
                  fetchStatus()
                }}
              >
                <XCircleIcon className="size-3.5" />
                Disconnect All
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
