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
  ShieldIcon,
  HashIcon,
  ZapIcon,
  LoaderIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  HeartPulseIcon,
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

interface EnvCheck {
  code: string
  level: "info" | "warn" | "error"
  message: string
}

export default function ConnectAgentPage() {
  const router = useRouter()

  // Identity
  const [agentName, setAgentName] = useState("")
  const [agentId, setAgentId] = useState("")
  const [description] = useState("")

  // Adapter
  const [adapterType, setAdapterType] = useState("openclaw_gateway")
  const [gatewayUrl, setGatewayUrl] = useState("ws://127.0.0.1:18789")
  const [gatewayToken, setGatewayToken] = useState("xo")
  const [sessionKeyStrategy] = useState("issue")
  const [payloadTemplate, setPayloadTemplate] = useState(
    JSON.stringify(
      { agentId: "{{agent.id}}", metadata: { team: "platform" } },
      null,
      2
    )
  )

  // Environment test
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "pass" | "warn" | "fail">("idle")
  const [testChecks, setTestChecks] = useState<EnvCheck[]>([])
  const [testLatency, setTestLatency] = useState(0)

  // Heartbeat
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(false)
  const [heartbeatInterval, setHeartbeatInterval] = useState("300")

  // Role & Permissions
  const [role, setRole] = useState("Engineering")
  const [permission, setPermission] = useState("member")
  const [modelProvider, setModelProvider] = useState("anthropic")
  const [model, setModel] = useState("claude-sonnet-4")
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["general"])

  // Instructions
  const [instructions, setInstructions] = useState("")

  // Submit
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNameChange = (value: string) => {
    setAgentName(value)
    if (!agentId || agentId === agentName.toLowerCase().replace(/\s+/g, "-")) {
      setAgentId(value.toLowerCase().replace(/\s+/g, "-"))
    }
  }

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    )
  }

  // ─── Test Environment ─────────────────────────────────────

  const handleTestEnvironment = async () => {
    setTestStatus("testing")
    setTestChecks([])
    try {
      const res = await fetch("/api/openclaw/agents/test-environment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gatewayUrl, gatewayToken }),
      })
      const data = await res.json()
      if (data.ok) {
        setTestStatus(data.data.status)
        setTestChecks(data.data.checks ?? [])
        setTestLatency(data.data.latencyMs ?? 0)
      } else {
        setTestStatus("fail")
        setTestChecks([{ code: "request", level: "error", message: data.error ?? "Test failed" }])
      }
    } catch {
      setTestStatus("fail")
      setTestChecks([{ code: "network", level: "error", message: "Network error" }])
    }
  }

  // ─── Create Agent ─────────────────────────────────────────

  const handleSubmit = async () => {
    if (!agentName.trim()) { setError("Agent name is required"); return }
    if (!agentId.trim()) { setError("Agent ID is required"); return }
    if (!gatewayUrl.trim()) { setError("Gateway URL is required"); return }

    // Validate payload template JSON
    let parsedPayload: Record<string, unknown> = {}
    try {
      parsedPayload = JSON.parse(payloadTemplate)
    } catch {
      setError("Payload template is not valid JSON")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/openclaw/agents/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agentId.trim(),
          name: agentName.trim(),
          description,
          systemInstructions: instructions,
          role,
          permission,
          model,
          modelProvider,
          channels: selectedChannels,
          adapterType,
          gatewayUrl: gatewayUrl.trim(),
          gatewayToken: gatewayToken.trim(),
          sessionKeyStrategy,
          payloadTemplate: parsedPayload,
          heartbeat: {
            enabled: heartbeatEnabled,
            intervalSec: parseInt(heartbeatInterval) || 300,
            wakeOnDemand: true,
            maxConcurrentRuns: 1,
          },
        }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push("/org/agents")
      } else {
        setError(data.error ?? "Failed to connect agent")
      }
    } catch {
      setError("Failed to connect agent")
    } finally {
      setSubmitting(false)
    }
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
              <h2 className="text-lg font-semibold">New Agent</h2>
              <p className="text-sm text-muted-foreground">
                Advanced agent configuration
              </p>
            </div>
          </div>

          <div className="grid gap-6 @3xl/main:grid-cols-2">
            {/* ─── Left Column: Identity + Adapter ─── */}
            <div className="flex flex-col gap-6">
              {/* Identity */}
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
                  <div className="grid gap-2">
                    <Label htmlFor="agent-name">Agent name</Label>
                    <Input
                      id="agent-name"
                      placeholder="e.g. VP of Engineering"
                      value={agentName}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Adapter */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ZapIcon className="size-4 text-muted-foreground" />
                      <CardTitle>Adapter</CardTitle>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestEnvironment}
                      disabled={testStatus === "testing"}
                    >
                      {testStatus === "testing" && <LoaderIcon className="size-3.5 animate-spin" />}
                      Test environment
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Adapter type</Label>
                    <Select value={adapterType} onValueChange={(v) => v && setAdapterType(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openclaw_gateway">OpenClaw Gateway</SelectItem>
                        <SelectItem value="http">HTTP Endpoint</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="gateway-url">Gateway URL</Label>
                    <Input
                      id="gateway-url"
                      placeholder="ws://127.0.0.1:18789"
                      value={gatewayUrl}
                      onChange={(e) => setGatewayUrl(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="gateway-token">Gateway Token</Label>
                    <Input
                      id="gateway-token"
                      type="password"
                      placeholder="xo"
                      value={gatewayToken}
                      onChange={(e) => setGatewayToken(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="payload-template">Payload template JSON</Label>
                    <Textarea
                      id="payload-template"
                      value={payloadTemplate}
                      onChange={(e) => setPayloadTemplate(e.target.value)}
                      className="min-h-28 resize-y font-mono text-sm"
                      spellCheck={false}
                    />
                  </div>

                  {/* Environment test results */}
                  {testChecks.length > 0 && (
                    <div className="rounded-md border p-3 text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        {testStatus === "pass" && <CheckCircleIcon className="size-4 text-green-500" />}
                        {testStatus === "warn" && <AlertTriangleIcon className="size-4 text-yellow-500" />}
                        {testStatus === "fail" && <XCircleIcon className="size-4 text-destructive" />}
                        <span className="font-medium">
                          {testStatus === "pass" ? "All checks passed" : testStatus === "warn" ? "Passed with warnings" : "Environment check failed"}
                        </span>
                        <span className="text-muted-foreground ml-auto">{testLatency}ms</span>
                      </div>
                      {testChecks.map((check, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs py-0.5">
                          {check.level === "info" && <CheckCircleIcon className="size-3 mt-0.5 text-green-500 shrink-0" />}
                          {check.level === "warn" && <AlertTriangleIcon className="size-3 mt-0.5 text-yellow-500 shrink-0" />}
                          {check.level === "error" && <XCircleIcon className="size-3 mt-0.5 text-destructive shrink-0" />}
                          <span className="text-muted-foreground">{check.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Separator />

                  {/* Run Policy / Heartbeat */}
                  <div className="flex items-center gap-2">
                    <HeartPulseIcon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Run Policy</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Heartbeat on interval</Label>
                      <p className="text-xs text-muted-foreground">
                        Periodically wake the agent to check for updates
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={heartbeatEnabled}
                      onClick={() => setHeartbeatEnabled(!heartbeatEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        heartbeatEnabled ? "bg-primary" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block size-5 transform rounded-full bg-background shadow-sm ring-0 transition-transform ${
                          heartbeatEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  {heartbeatEnabled && (
                    <div className="grid gap-2">
                      <Label htmlFor="heartbeat-interval">Interval (seconds)</Label>
                      <Input
                        id="heartbeat-interval"
                        type="number"
                        min="30"
                        value={heartbeatInterval}
                        onChange={(e) => setHeartbeatInterval(e.target.value)}
                        className="w-32"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ─── Right Column: Role + Channels ─── */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <ShieldIcon className="size-4 text-muted-foreground" />
                    <CardTitle>Role &amp; Permissions</CardTitle>
                  </div>
                  <CardDescription>
                    Define the agent&apos;s role, model, and what it can access.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Role</Label>
                    <Select value={role} onValueChange={(v) => v && setRole(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
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
                    <Label>Permission</Label>
                    <Select value={permission} onValueChange={(v) => v && setPermission(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="mod">Mod</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Model Provider</Label>
                    <Select value={modelProvider} onValueChange={(v) => v && setModelProvider(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
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
                    <Select value={model} onValueChange={(v) => v && setModel(v)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
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
                  {submitting ? "Creating..." : "Create agent"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  )
}
