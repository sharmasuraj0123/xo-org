"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeftIcon,
  BotIcon,
  GlobeIcon,
  KeyIcon,
  ShieldIcon,
  HashIcon,
  ZapIcon,
  LoaderIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react"

const availableChannels = [
  "general",
  "engineering",
  "design",
  "product",
  "support",
  "sales",
  "marketing",
  "random",
]

interface GatewaySession {
  key: string
  sessionId: string
  model: string
  totalTokens: number
}

export default function ConnectAgentPage() {
  const router = useRouter()

  // Form state
  const [agentName, setAgentName] = useState("")
  const [agentId, setAgentId] = useState("")
  const [description, setDescription] = useState("")
  const [adapterType, setAdapterType] = useState("openclaw_gateway")
  const [agentUrl, setAgentUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [role, setRole] = useState("Engineering")
  const [permission, setPermission] = useState("member")
  const [modelProvider, setModelProvider] = useState("anthropic")
  const [model, setModel] = useState("claude-sonnet")
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["general"])
  const [instructions, setInstructions] = useState("")

  // OpenClaw state
  const [sessions, setSessions] = useState<GatewaySession[]>([])
  const [selectedSession, setSelectedSession] = useState("")
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [gatewayReachable, setGatewayReachable] = useState<boolean | null>(null)

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel)
        ? prev.filter((c) => c !== channel)
        : [...prev, channel]
    )
  }

  // Auto-generate agent ID from name
  const handleNameChange = (value: string) => {
    setAgentName(value)
    if (!agentId || agentId === agentName.toLowerCase().replace(/\s+/g, "-")) {
      setAgentId(value.toLowerCase().replace(/\s+/g, "-"))
    }
  }

  // Fetch sessions from OpenClaw Gateway
  const fetchSessions = async () => {
    setLoadingSessions(true)
    setError(null)
    try {
      const res = await fetch("/api/openclaw/agents/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.ok && data.data?.action === "pick_session") {
        setSessions(data.data.sessions ?? [])
        setGatewayReachable(true)
        if (data.data.sessions?.length > 0 && !selectedSession) {
          setSelectedSession(data.data.sessions[0].key)
        }
        if (data.data.sessions?.length === 0) {
          setError("No active sessions in Gateway. Start an agent in OpenClaw first.")
        }
      } else {
        setGatewayReachable(false)
        setError(data.error ?? "Cannot reach Gateway")
      }
    } catch {
      setGatewayReachable(false)
      setError("Cannot reach OpenClaw Gateway")
    } finally {
      setLoadingSessions(false)
    }
  }

  // Handle adapter type change
  const handleAdapterChange = (value: string) => {
    setAdapterType(value)
    if (value === "openclaw_gateway" && sessions.length === 0) {
      fetchSessions()
    }
  }

  // Submit the form
  const handleSubmit = async () => {
    if (!agentName.trim()) { setError("Agent name is required"); return }
    if (!agentId.trim()) { setError("Agent ID is required"); return }

    setSubmitting(true)
    setError(null)

    try {
      if (adapterType === "openclaw_gateway") {
        // Connect via OpenClaw Gateway
        if (!selectedSession) { setError("Select a Gateway session"); setSubmitting(false); return }

        const res = await fetch("/api/openclaw/agents/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agentId.trim(),
            sessionKey: selectedSession,
            name: agentName.trim(),
            role,
            model,
            channels: selectedChannels,
          }),
        })
        const data = await res.json()
        if (!data.ok) { setError(data.error ?? "Failed to connect"); setSubmitting(false); return }
      } else {
        // Connect via HTTP endpoint
        if (!agentUrl.trim()) { setError("Agent URL is required"); setSubmitting(false); return }

        const res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: agentId.trim(),
            name: agentName.trim(),
            role,
            model,
            channels: selectedChannels,
            capacity: 3,
          }),
        })
        const data = await res.json()
        if (!data.ok) { setError(data.error ?? "Failed to register agent"); setSubmitting(false); return }
      }

      router.push("/org/agents")
    } catch {
      setError("Failed to connect agent")
    } finally {
      setSubmitting(false)
    }
  }

  // Fetch sessions on initial load if OpenClaw adapter is selected
  if (adapterType === "openclaw_gateway" && sessions.length === 0 && gatewayReachable === null && !loadingSessions) {
    fetchSessions()
  }

  return (
    <>
      <SiteHeader title="Connect Agent" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-6 p-4 md:p-6">
          {/* Back + heading */}
          <div className="flex items-center gap-3">
            <Link href="/org/agents">
              <Button variant="outline" size="icon">
                <ArrowLeftIcon className="size-4" />
              </Button>
            </Link>
            <div>
              <h2 className="text-lg font-semibold">Connect a New Agent</h2>
              <p className="text-sm text-muted-foreground">
                Register an external agent by providing its endpoint and
                credentials.
              </p>
            </div>
          </div>

          <div className="grid gap-6 @3xl/main:grid-cols-2">
            {/* Identity & Connection */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BotIcon className="size-4 text-muted-foreground" />
                  <CardTitle>Identity</CardTitle>
                </div>
                <CardDescription>
                  Name and describe this agent so your team can identify it.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="agent-name">Agent Name</Label>
                    <Input
                      id="agent-name"
                      placeholder="e.g. Research Assistant"
                      value={agentName}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="agent-id">Agent ID</Label>
                    <Input
                      id="agent-id"
                      placeholder="e.g. research-assistant"
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="agent-description">Description</Label>
                  <Textarea
                    id="agent-description"
                    placeholder="What does this agent do?"
                    className="min-h-20 resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <Separator />

                {/* Adapter Type */}
                <div className="flex items-center gap-2">
                  <ZapIcon className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Adapter Type</span>
                </div>
                <Select value={adapterType} onValueChange={handleAdapterChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select adapter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openclaw_gateway">OpenClaw Gateway</SelectItem>
                    <SelectItem value="http">HTTP Endpoint</SelectItem>
                  </SelectContent>
                </Select>

                {adapterType === "openclaw_gateway" ? (
                  <>
                    {/* Gateway session picker */}
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label>Gateway Session</Label>
                        {gatewayReachable === true && (
                          <Badge variant="outline" className="text-xs">
                            <WifiIcon className="size-3" /> Connected
                          </Badge>
                        )}
                        {gatewayReachable === false && (
                          <Badge variant="destructive" className="text-xs">
                            <WifiOffIcon className="size-3" /> Unreachable
                          </Badge>
                        )}
                      </div>
                      {loadingSessions ? (
                        <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                          <LoaderIcon className="size-3.5 animate-spin" />
                          Fetching sessions from Gateway...
                        </div>
                      ) : sessions.length > 0 ? (
                        <Select value={selectedSession} onValueChange={setSelectedSession}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a session..." />
                          </SelectTrigger>
                          <SelectContent>
                            {sessions.map((s) => (
                              <SelectItem key={s.key} value={s.key}>
                                {s.key} — {s.model} ({(s.totalTokens / 1000).toFixed(0)}k tokens)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {gatewayReachable === false
                            ? "Start the OpenClaw Gateway to see available sessions."
                            : "No sessions available."}
                        </p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-fit"
                        onClick={fetchSessions}
                        disabled={loadingSessions}
                      >
                        {loadingSessions
                          ? <LoaderIcon className="size-3.5 animate-spin" />
                          : <WifiIcon className="size-3.5" />}
                        Refresh Sessions
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* HTTP endpoint fields */}
                    <div className="flex items-center gap-2">
                      <GlobeIcon className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Connection Endpoint</span>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="agent-url">Agent URL</Label>
                      <Input
                        id="agent-url"
                        placeholder="https://api.example.com/agent"
                        value={agentUrl}
                        onChange={(e) => setAgentUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        The base URL where this agent is hosted. Must be
                        accessible from your network.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="api-key">
                        <KeyIcon className="size-3.5" />
                        API Key
                      </Label>
                      <Input
                        id="api-key"
                        type="password"
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Role & Permissions */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldIcon className="size-4 text-muted-foreground" />
                  <CardTitle>Role & Permissions</CardTitle>
                </div>
                <CardDescription>
                  Define the agent&apos;s role, model, and what it can access.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Permission</Label>
                  <Select value={permission} onValueChange={setPermission}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select permission" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="mod">Mod</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Research">Research</SelectItem>
                      <SelectItem value="Engineering">Engineering</SelectItem>
                      <SelectItem value="DevOps">DevOps</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Product">Product</SelectItem>
                      <SelectItem value="Analytics">Analytics</SelectItem>
                      <SelectItem value="Security">Security</SelectItem>
                      <SelectItem value="Support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Model Provider</Label>
                  <Select value={modelProvider} onValueChange={setModelProvider}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-opus-4">Claude Opus</SelectItem>
                      <SelectItem value="claude-sonnet-4">Claude Sonnet</SelectItem>
                      <SelectItem value="claude-haiku">Claude Haiku</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="flex items-center gap-2">
                  <HashIcon className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Channel Access</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select which channels this agent can read and respond in.
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableChannels.map((channel) => (
                    <Badge
                      key={channel}
                      variant={selectedChannels.includes(channel) ? "default" : "outline"}
                      className="cursor-pointer select-none hover:bg-primary hover:text-primary-foreground"
                      onClick={() => toggleChannel(channel)}
                    >
                      #{channel}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>System Instructions</CardTitle>
              <CardDescription>
                Provide the system prompt or persona instructions this agent
                should follow when responding.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="You are a helpful research assistant that specializes in..."
                className="min-h-32 resize-y"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t px-6 py-4">
              <div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <div className="flex gap-2">
                <Link href="/org/agents">
                  <Button variant="outline">Cancel</Button>
                </Link>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting && <LoaderIcon className="size-4 animate-spin" />}
                  {submitting ? "Connecting..." : "Connect Agent"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  )
}
