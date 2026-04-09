"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LoaderIcon, CheckCircleIcon, XCircleIcon, RefreshCwIcon,
  PlusIcon, ZapIcon, Trash2Icon, WifiIcon, WifiOffIcon,
} from "lucide-react"

interface ConnectedAgent {
  agentId: string
  name: string
  role: string
  model: string
  channels: string[]
  url: string
  status: "connected" | "disconnected"
  totalRuns: number
  connectedAt: number
}

interface OpenClawStatus {
  connected: boolean
  agents: ConnectedAgent[]
}

export function OpenClawConnector() {
  const [status, setStatus] = useState<OpenClawStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [agentId, setAgentId] = useState("")
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [webhookAuthHeader, setWebhookAuthHeader] = useState("")
  const [role, setRole] = useState("Engineering")
  const [channels, setChannels] = useState("general")

  const fetchStatus = useCallback(() => {
    setLoading(true)
    fetch("/api/openclaw/agents/status")
      .then((r) => r.json())
      .then((data) => { if (data.ok) setStatus(data.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const resetForm = () => {
    setAgentId("")
    setName("")
    setUrl("")
    setWebhookAuthHeader("")
    setRole("Engineering")
    setChannels("general")
    setError(null)
  }

  const handleConnect = async () => {
    if (!agentId.trim()) { setError("Agent ID is required"); return }
    if (!url.trim()) { setError("Webhook URL is required"); return }

    setConnecting(true)
    setError(null)
    try {
      const res = await fetch("/api/openclaw/agents/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agentId.trim(),
          name: name.trim() || agentId.trim(),
          url: url.trim(),
          webhookAuthHeader: webhookAuthHeader.trim() || undefined,
          role,
          channels: channels.split(",").map((c) => c.trim()).filter(Boolean),
        }),
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
      setError("Connection failed")
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async (id: string) => {
    try {
      await fetch(`/api/openclaw/agents/disconnect?agentId=${id}`, { method: "DELETE" })
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
              <ZapIcon className="size-5 text-muted-foreground" />
            </div>
            <div><CardTitle>OpenClaw</CardTitle><CardDescription>Loading...</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <LoaderIcon className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const agents = status?.agents ?? []
  const connectedCount = agents.filter((a) => a.status === "connected").length

  // ─── Main Render ──────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted/60 ring-1 ring-foreground/5">
            <ZapIcon className="size-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle>OpenClaw</CardTitle>
              {connectedCount > 0 ? (
                <Badge variant="default" className="bg-primary/15 text-primary">
                  <WifiIcon className="size-3" />
                  {connectedCount} agent{connectedCount !== 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <WifiOffIcon className="size-3" />
                  No agents
                </Badge>
              )}
            </div>
            <CardDescription>
              {connectedCount > 0
                ? "OpenClaw agents registered in the org bridge"
                : "Connect OpenClaw webhook agents to participate in the org — receive tasks, send messages, collaborate."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Connected agents list */}
        {agents.length > 0 && (
          <div className="flex flex-col gap-2">
            {agents.map((agent) => (
              <div
                key={agent.agentId}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{agent.name}</span>
                  <span className="ml-1.5 text-muted-foreground text-xs">
                    ({agent.agentId})
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-xs">{agent.role}</Badge>
                    <Badge variant="outline" className="text-xs">{agent.model}</Badge>
                    {agent.totalRuns > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {agent.totalRuns} run{agent.totalRuns !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 shrink-0"
                  onClick={() => handleDisconnect(agent.agentId)}
                >
                  <Trash2Icon className="size-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add agent form */}
        {showForm && (
          <div className="flex flex-col gap-2.5 rounded-md border p-3">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded-md border bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Agent ID (e.g. aria)"
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
              />
              <input
                className="rounded-md border bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Display name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Webhook URL</label>
              <input
                className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="https://api.example.com/webhook"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Authorization Header (optional)</label>
              <input
                className="w-full rounded-md border bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Bearer your-token-here"
                type="password"
                value={webhookAuthHeader}
                onChange={(e) => setWebhookAuthHeader(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                className="rounded-md border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="Research">Research</option>
                <option value="Engineering">Engineering</option>
                <option value="DevOps">DevOps</option>
                <option value="Design">Design</option>
                <option value="Product">Product</option>
                <option value="Analytics">Analytics</option>
                <option value="Security">Security</option>
                <option value="Support">Support</option>
              </select>
              <input
                className="rounded-md border bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Channels (comma-separated)"
                value={channels}
                onChange={(e) => setChannels(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button size="sm" onClick={handleConnect} disabled={connecting}>
                {connecting
                  ? <LoaderIcon className="size-3.5 animate-spin" />
                  : <CheckCircleIcon className="size-3.5" />}
                {connecting ? "Connecting..." : "Connect Agent"}
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
              variant={agents.length > 0 ? "outline" : "default"}
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <PlusIcon className="size-3.5" />
              Add OpenClaw Agent
            </Button>
          )}
          {agents.length > 0 && (
            <Button variant="outline" size="sm" onClick={fetchStatus}>
              <RefreshCwIcon className="size-3.5" />
              Refresh
            </Button>
          )}
          {agents.length > 1 && (
            <>
              <div className="flex-1" />
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  for (const a of agents) {
                    await fetch(`/api/openclaw/agents/disconnect?agentId=${a.agentId}`, { method: "DELETE" })
                  }
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
